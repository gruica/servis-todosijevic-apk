// SMS Mobile API Routes - Endpoint-i za novi SmsMobile servis
import { Router } from 'express';
import { SmsMobileAPIService } from './sms-mobile-api-service.js';
import { IStorage } from './storage.js';
import { jwtAuth } from './auth.js';

export function createSMSMobileRoutes(storage: IStorage): Router {
  const router = Router();

  // Helper funkcija za kreiranje SMS servisa iz baze podataka
  async function createSMSMobileService(): Promise<SmsMobileAPIService | null> {
    try {
      const settings = await storage.getSystemSettings();
      
      const apiKey = settings.find(s => s.key === 'sms_mobile_api_key')?.value;
      const baseURL = settings.find(s => s.key === 'sms_mobile_base_url')?.value || 'https://api.smsmobile.rs/api/v1';
      const gatewayName = settings.find(s => s.key === 'sms_mobile_gateway_name')?.value || 'default';
      const timeout = parseInt(settings.find(s => s.key === 'sms_mobile_timeout')?.value || '10000');

      if (!apiKey) {
        console.log('[SMS MOBILE API] ⚠️ API ključ nije konfigurisan');
        return null;
      }

      return new SmsMobileAPIService({
        apiKey,
        baseURL,
        gatewayName,
        timeout
      });
    } catch (error) {
      console.error('[SMS MOBILE API] ❌ Greška pri kreiranju SMS servisa:', error);
      return null;
    }
  }

  // POST /api/sms/mobile/send - Pošalji pojedinačni SMS
  router.post('/send', jwtAuth, async (req, res) => {
    try {
      const { phoneNumber, message, priority } = req.body;

      if (!phoneNumber || !message) {
        return res.status(400).json({
          success: false,
          error: 'phoneNumber i message su obavezni'
        });
      }

      const smsService = await createSMSMobileService();
      if (!smsService) {
        return res.status(503).json({
          success: false,
          error: 'SMS servis nije konfigurisan'
        });
      }

      console.log(`[SMS MOBILE API] 📱 Zahtev za slanje SMS-a na ${phoneNumber}`);
      
      const result = await smsService.sendSMS({
        phoneNumber,
        message,
        priority: priority || 'normal'
      });

      if (result.success) {
        res.json({
          success: true,
          messageId: result.messageId,
          timestamp: result.timestamp
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error,
          timestamp: result.timestamp
        });
      }
    } catch (error: any) {
      console.error('[SMS MOBILE API] ❌ Greška pri slanju SMS-a:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // POST /api/sms/mobile/send-bulk - Pošalji grupno SMS
  router.post('/send-bulk', jwtAuth, async (req, res) => {
    try {
      const { messages } = req.body;

      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'messages mora biti niz sa najmanje jednim elementom'
        });
      }

      const smsService = await createSMSMobileService();
      if (!smsService) {
        return res.status(503).json({
          success: false,
          error: 'SMS servis nije konfigurisan'
        });
      }

      console.log(`[SMS MOBILE API] 📬 Zahtev za grupno slanje ${messages.length} SMS poruka`);
      
      const results = await smsService.sendBulkSMS(messages);
      
      const successCount = results.filter(r => r.success).length;
      
      res.json({
        success: true,
        totalMessages: messages.length,
        successCount: successCount,
        failedCount: messages.length - successCount,
        results: results
      });
    } catch (error: any) {
      console.error('[SMS MOBILE API] ❌ Greška pri grupnom slanju SMS-a:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // GET /api/sms/mobile/status - Proveri status API-ja
  router.get('/status', jwtAuth, async (req, res) => {
    try {
      const smsService = await createSMSMobileService();
      if (!smsService) {
        return res.status(503).json({
          connected: false,
          error: 'SMS servis nije konfigurisan'
        });
      }

      console.log(`[SMS MOBILE API] 🔍 Provera status API-ja`);
      
      const status = await smsService.checkAPIStatus();
      
      res.json(status);
    } catch (error: any) {
      console.error('[SMS MOBILE API] ❌ Greška pri proveri statusa:', error);
      res.status(500).json({
        connected: false,
        error: error.message
      });
    }
  });

  // GET /api/sms/mobile/credits - Dohvati broj kredita
  router.get('/credits', jwtAuth, async (req, res) => {
    try {
      const smsService = await createSMSMobileService();
      if (!smsService) {
        return res.status(503).json({
          success: false,
          error: 'SMS servis nije konfigurisan'
        });
      }

      console.log(`[SMS MOBILE API] 💰 Dohvatanje broja kredita`);
      
      const result = await smsService.getCredits();
      
      res.json(result);
    } catch (error: any) {
      console.error('[SMS MOBILE API] ❌ Greška pri dohvatanju kredita:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // GET /api/sms/mobile/gateways - Dohvati listu gateway-a
  router.get('/gateways', jwtAuth, async (req, res) => {
    try {
      const smsService = await createSMSMobileService();
      if (!smsService) {
        return res.status(503).json({
          success: false,
          error: 'SMS servis nije konfigurisan'
        });
      }

      console.log(`[SMS MOBILE API] 📱 Dohvatanje liste gateway-a`);
      
      const result = await smsService.getGateways();
      
      res.json(result);
    } catch (error: any) {
      console.error('[SMS MOBILE API] ❌ Greška pri dohvatanju gateway-a:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // POST /api/sms/mobile/test - Test slanje SMS-a
  router.post('/test', jwtAuth, async (req, res) => {
    try {
      const { phoneNumber } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          error: 'phoneNumber je obavezan'
        });
      }

      const smsService = await createSMSMobileService();
      if (!smsService) {
        return res.status(503).json({
          success: false,
          error: 'SMS servis nije konfigurisan'
        });
      }

      const testMessage = `Test SMS poruka sa SmsMobile API servisa.\nVreme: ${new Date().toLocaleString('sr-RS')}\nServis: Frigo Sistem Todosijević`;

      console.log(`[SMS MOBILE API] 🧪 Test slanje SMS-a na ${phoneNumber}`);
      
      const result = await smsService.sendSMS({
        phoneNumber,
        message: testMessage
      });

      if (result.success) {
        res.json({
          success: true,
          message: 'Test SMS uspešno poslat',
          messageId: result.messageId,
          timestamp: result.timestamp
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error,
          timestamp: result.timestamp
        });
      }
    } catch (error: any) {
      console.error('[SMS MOBILE API] ❌ Greška pri test slanju:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
}