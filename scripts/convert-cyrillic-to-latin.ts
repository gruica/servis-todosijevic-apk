import { db } from "../server/db";
import { users, technicians } from "../shared/schema";
import { eq } from "drizzle-orm";

// Mapa ćiriličnih slova u latinična
const cyrillicToLatin: Record<string, string> = {
  'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Ђ': 'Đ', 'Е': 'E', 'Ж': 'Ž',
  'З': 'Z', 'И': 'I', 'Ј': 'J', 'К': 'K', 'Л': 'L', 'Љ': 'Lj', 'М': 'M', 'Н': 'N',
  'Њ': 'Nj', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'Ћ': 'Ć', 'У': 'U',
  'Ф': 'F', 'Х': 'H', 'Ц': 'C', 'Ч': 'Č', 'Џ': 'Dž', 'Ш': 'Š',
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'ђ': 'đ', 'е': 'e', 'ж': 'ž',
  'з': 'z', 'и': 'i', 'ј': 'j', 'к': 'k', 'л': 'l', 'љ': 'lj', 'м': 'm', 'н': 'n',
  'њ': 'nj', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'ћ': 'ć', 'у': 'u',
  'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'č', 'џ': 'dž', 'ш': 'š'
};

// Funkcija za pretvaranje ćirilice u latinicu
function convertCyrillicToLatin(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    result += cyrillicToLatin[char] || char;
  }
  return result;
}

async function convertAllNames() {
  try {
    console.log("Konverzija ćiriličnih imena u latinična...");
    
    // Korisnici
    const allUsers = await db.select().from(users);
    let usersUpdated = 0;
    
    for (const user of allUsers) {
      const originalName = user.fullName;
      const latinName = convertCyrillicToLatin(originalName);
      
      if (originalName !== latinName) {
        await db
          .update(users)
          .set({ fullName: latinName })
          .where(eq(users.id, user.id));
        
        console.log(`Korisnik: ${originalName} -> ${latinName}`);
        usersUpdated++;
      }
    }
    
    // Tehničari
    const allTechnicians = await db.select().from(technicians);
    let techniciansUpdated = 0;
    
    for (const tech of allTechnicians) {
      const originalName = tech.fullName;
      const latinName = convertCyrillicToLatin(originalName);
      
      if (originalName !== latinName) {
        await db
          .update(technicians)
          .set({ fullName: latinName })
          .where(eq(technicians.id, tech.id));
        
        console.log(`Tehničar: ${originalName} -> ${latinName}`);
        techniciansUpdated++;
      }
    }
    
    console.log(`\nKonverzija završena:`);
    console.log(`- Ažurirano korisnika: ${usersUpdated}`);
    console.log(`- Ažurirano tehničara: ${techniciansUpdated}`);
    
  } catch (error) {
    console.error('Greška pri konverziji:', error);
  } finally {
    process.exit(0);
  }
}

convertAllNames();