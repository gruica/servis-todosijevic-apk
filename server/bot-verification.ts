import { Request, Response } from 'express';
import { storage } from './storage';
import { v4 as uuidv4 } from 'uuid';

interface BotChallenge {
  id: string;
  question: string;
  answer: number;
  expiresAt: Date;
}

// Generisanje jednostavnog matematičkog zadatka
export function generateMathChallenge(): BotChallenge {
  const num1 = Math.floor(Math.random() * 10) + 1;
  const num2 = Math.floor(Math.random() * 10) + 1;
  const operations = ['+', '-', '*'];
  const operation = operations[Math.floor(Math.random() * operations.length)];
  
  let answer: number;
  let question: string;
  
  switch (operation) {
    case '+':
      answer = num1 + num2;
      question = `${num1} + ${num2} = ?`;
      break;
    case '-':
      // Osiguraj da je rezultat pozitivan
      const larger = Math.max(num1, num2);
      const smaller = Math.min(num1, num2);
      answer = larger - smaller;
      question = `${larger} - ${smaller} = ?`;
      break;
    case '*':
      answer = num1 * num2;
      question = `${num1} × ${num2} = ?`;
      break;
    default:
      answer = num1 + num2;
      question = `${num1} + ${num2} = ?`;
  }
  
  return {
    id: uuidv4(),
    question,
    answer,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minuta
  };
}

// Middleware za proveru bot verifikacije
export async function checkBotVerification(req: Request, res: Response, next: Function) {
  try {
    const sessionId = req.session?.id || req.ip;
    
    if (!sessionId) {
      return res.status(400).json({
        error: "Nedostaje sesija",
        message: "Molimo restartujte stranicu i pokušajte ponovo."
      });
    }
    
    // Proverava da li je korisnik već verifikovan
    const existingVerification = await storage.getBotVerification(sessionId);
    
    if (existingVerification && existingVerification.verified && existingVerification.expiresAt > new Date()) {
      return next();
    }
    
    return res.status(403).json({
      error: "Bot verifikacija potrebna",
      message: "Molimo verifikujte da niste bot.",
      requiresVerification: true
    });
  } catch (error) {
    console.error('Bot verification error:', error);
    return res.status(500).json({
      error: "Greška sistema",
      message: "Pokušajte ponovo kasnije."
    });
  }
}

// API endpoint za dobijanje bot challenge-a
export async function getBotChallenge(req: Request, res: Response) {
  try {
    const challenge = generateMathChallenge();
    
    // Sačuvaj challenge u bazi podataka
    await storage.createBotVerification({
      sessionId: challenge.id,
      question: challenge.question,
      correctAnswer: challenge.answer,
      expiresAt: challenge.expiresAt,
      createdAt: new Date()
    });
    
    res.json({
      sessionId: challenge.id,
      question: challenge.question,
      expiresAt: challenge.expiresAt
    });
  } catch (error) {
    console.error('Get bot challenge error:', error);
    res.status(500).json({
      error: "Greška sistema",
      message: "Pokušajte ponovo kasnije."
    });
  }
}

// API endpoint za verifikaciju bot odgovora
export async function verifyBotAnswer(req: Request, res: Response) {
  try {
    const { sessionId, answer } = req.body;
    
    if (!sessionId || answer === undefined) {
      return res.status(400).json({
        error: "Nedostaju podaci",
        message: "Molimo pošaljite sessionId i odgovor."
      });
    }
    
    const verification = await storage.getBotVerification(sessionId);
    
    if (!verification) {
      return res.status(404).json({
        error: "Challenge nije pronađen",
        message: "Molimo tražite novi challenge."
      });
    }
    
    if (verification.expiresAt < new Date()) {
      return res.status(410).json({
        error: "Challenge je istekao",
        message: "Molimo tražite novi challenge."
      });
    }
    
    // Inkrementuje broj pokušaja
    const attempts = verification.attempts + 1;
    
    if (attempts > 3) {
      return res.status(429).json({
        error: "Previše pokušaja",
        message: "Molimo tražite novi challenge."
      });
    }
    
    const isCorrect = parseInt(answer) === verification.correctAnswer;
    
    await storage.updateBotVerification(sessionId, {
      userAnswer: parseInt(answer),
      attempts,
      verified: isCorrect
    });
    
    if (isCorrect) {
      res.json({
        success: true,
        message: "Verifikacija uspešna!",
        verified: true
      });
    } else {
      res.json({
        success: false,
        message: `Netačan odgovor. Pokušaj ${attempts}/3`,
        verified: false,
        remainingAttempts: 3 - attempts
      });
    }
  } catch (error) {
    console.error('Verify bot answer error:', error);
    res.status(500).json({
      error: "Greška sistema",
      message: "Pokušajte ponovo kasnije."
    });
  }
}