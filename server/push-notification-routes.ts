import express from 'express';
import { pushNotificationService } from './push-notification-service';
import { jwtAuthMiddleware } from './jwt-auth';

const router = express.Router();

// VAPID public key endpoint
router.get('/vapid-public-key', (req, res) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return res.status(500).json({ error: 'VAPID public key nije konfigurisan' });
  }
  res.json({ publicKey });
});

// Sačuvaj push subscription
router.post('/subscribe', jwtAuthMiddleware, async (req, res) => {
  try {
    const { subscription } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Korisnik nije autentifikovani' });
    }

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Nevaljan subscription objekti' });
    }

    const success = await pushNotificationService.saveSubscription(userId, subscription);
    
    if (success) {
      res.json({ message: 'Push subscription sačuvan uspešno' });
    } else {
      res.status(500).json({ error: 'Greška pri čuvanju push subscription' });
    }
  } catch (error) {
    console.error('Greška u /subscribe endpoint:', error);
    res.status(500).json({ error: 'Interna greška servera' });
  }
});

// Ukloni push subscription
router.post('/unsubscribe', jwtAuthMiddleware, async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Korisnik nije autentifikovani' });
    }

    const success = await pushNotificationService.removeSubscription(userId);
    
    if (success) {
      res.json({ message: 'Push subscription uklonjen uspešno' });
    } else {
      res.status(500).json({ error: 'Greška pri uklanjanju push subscription' });
    }
  } catch (error) {
    console.error('Greška u /unsubscribe endpoint:', error);
    res.status(500).json({ error: 'Interna greška servera' });
  }
});

// Test push notifikacija (samo za admin)
router.post('/test', jwtAuthMiddleware, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Samo admin može poslati test notifikacije' });
    }

    const { userId, title, body } = req.body;

    if (!userId || !title || !body) {
      return res.status(400).json({ error: 'userId, title i body su obavezni' });
    }

    const success = await pushNotificationService.sendNotificationToUser(userId, {
      title,
      body,
      data: {
        type: 'test',
        timestamp: Date.now()
      }
    });

    if (success) {
      res.json({ message: 'Test notifikacija poslana uspešno' });
    } else {
      res.status(500).json({ error: 'Greška pri slanju test notifikacije' });
    }
  } catch (error) {
    console.error('Greška u /test endpoint:', error);
    res.status(500).json({ error: 'Interna greška servera' });
  }
});

// Pošalji notifikaciju svim tehničarima (samo za admin)
router.post('/broadcast-technicians', jwtAuthMiddleware, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Samo admin može poslati broadcast notifikacije' });
    }

    const { title, body, data } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: 'title i body su obavezni' });
    }

    const result = await pushNotificationService.sendNotificationToAllTechnicians({
      title,
      body,
      data: data || {}
    });

    res.json({
      message: 'Broadcast notifikacije poslane',
      successful: result.successful,
      failed: result.failed
    });
  } catch (error) {
    console.error('Greška u /broadcast-technicians endpoint:', error);
    res.status(500).json({ error: 'Interna greška servera' });
  }
});

export { router as pushNotificationRoutes };