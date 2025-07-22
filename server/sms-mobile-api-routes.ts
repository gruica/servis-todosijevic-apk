import { Router, Request, Response } from 'express';
import { IStorage } from './storage';
import { createSMSMobileAPIService } from './sms-mobile-api-service';
import { jwtAuth, requireRole } from './jwt-auth';

export function createSMSMobileAPIRoutes(storage: IStorage): Router {
  const router = Router();
  const smsService = createSMSMobileAPIService(storage);

  // Inicijalizuj servis
  smsService.initialize();

  // GET /api/sms-mobile-api/status - Status SMS Mobile API servisa
  router.get('/status', jwtAuth, requireRole(['admin', 'technician']), async (req: Request, res: Response) => {
    try {
      const config = smsService.getConfiguration();
      const status = await smsService.getApiStatus();
      
      res.json({
        enabled: config.enabled,
        configured: !!config.apiKey,
        baseUrl: config.baseUrl,
        timeout: config.timeout,
        apiStatus: status
      });
    } catch (error) {
      console.error('[SMS MOBILE API ROUTES] Greška pri dobijanju statusa:', error);
      res.status(500).json({
        success: false,
        error: 'Greška pri dobijanju statusa SMS Mobile API servisa'
      });
    }
  });

  // GET /api/sms-mobile-api/config - Dobij konfiguraciju
  router.get('/config', jwtAuth, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      const config = smsService.getConfiguration();
      
      // Ne vraćaj API ključ iz sigurnosnih razloga
      res.json({
        baseUrl: config.baseUrl,
        timeout: config.timeout,
        enabled: config.enabled,
        hasApiKey: !!config.apiKey
      });
    } catch (error) {
      console.error('[SMS MOBILE API ROUTES] Greška pri dobijanju konfiguracije:', error);
      res.status(500).json({
        success: false,
        error: 'Greška pri dobijanju konfiguracije'
      });
    }
  });

  // PUT /api/sms-mobile-api/config - Ažuriraj konfiguraciju
  router.put('/config', jwtAuth, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      const { apiKey, baseUrl, timeout, enabled } = req.body;
      
      const updateData: any = {};
      
      if (apiKey !== undefined) updateData.apiKey = apiKey;
      if (baseUrl !== undefined) updateData.baseUrl = baseUrl;
      if (timeout !== undefined) updateData.timeout = parseInt(timeout);
      if (enabled !== undefined) updateData.enabled = enabled === true || enabled === 'true';
      
      await smsService.updateConfiguration(updateData);
      
      res.json({
        success: true,
        message: 'Konfiguracija je uspešno ažurirana'
      });
    } catch (error) {
      console.error('[SMS MOBILE API ROUTES] Greška pri ažuriranju konfiguracije:', error);
      res.status(500).json({
        success: false,
        error: 'Greška pri ažuriranju konfiguracije'
      });
    }
  });

  // POST /api/sms-mobile-api/test - Test SMS Mobile API konekcije
  router.post('/test', jwtAuth, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      const result = await smsService.testConnection();
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('[SMS MOBILE API ROUTES] Greška pri testiranju:', error);
      res.status(500).json({
        success: false,
        error: 'Greška pri testiranju SMS Mobile API konekcije'
      });
    }
  });

  // POST /api/sms-mobile-api/send - Pošalji SMS poruku
  router.post('/send', jwtAuth, requireRole(['admin', 'technician']), async (req: Request, res: Response) => {
    try {
      const { phoneNumber, message, sendWhatsApp } = req.body;
      
      if (!phoneNumber || !message) {
        return res.status(400).json({
          success: false,
          error: 'Broj telefona i poruka su obavezni'
        });
      }
      
      const result = await smsService.sendSMS(phoneNumber, message, {
        sendWhatsApp: sendWhatsApp === true || sendWhatsApp === 'true'
      });
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('[SMS MOBILE API ROUTES] Greška pri slanju SMS-a:', error);
      res.status(500).json({
        success: false,
        error: 'Greška pri slanju SMS poruke'
      });
    }
  });

  // POST /api/sms-mobile-api/send-bulk - Pošalji bulk SMS poruke
  router.post('/send-bulk', jwtAuth, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      const { recipients, message, sendWhatsApp } = req.body;
      
      if (!recipients || !Array.isArray(recipients) || recipients.length === 0 || !message) {
        return res.status(400).json({
          success: false,
          error: 'Lista brojeva telefona i poruka su obavezni'
        });
      }
      
      const result = await smsService.sendBulkSMS(recipients, message, {
        sendWhatsApp: sendWhatsApp === true || sendWhatsApp === 'true'
      });
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('[SMS MOBILE API ROUTES] Greška pri slanju bulk SMS-a:', error);
      res.status(500).json({
        success: false,
        error: 'Greška pri slanju bulk SMS poruka'
      });
    }
  });

  return router;
}