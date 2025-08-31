import { Router, Request, Response } from 'express';
import { IStorage } from './storage';
import { SMSMobileAPIService, SendSMSRequest } from './sms-mobile-api-service';
import { jwtAuth, requireRole } from './jwt-auth';

export function createSMSMobileAPIRoutes(storage: IStorage): Router {
  const router = Router();

  // Helper funkcija za conversation logging - NOVO DODANO
  async function logConversationMessage(serviceId: number, phoneNumber: string, message: string, messageType: 'whatsapp' | 'sms' | 'auto' = 'whatsapp', mediaUrl?: string) {
    try {
      if (serviceId && phoneNumber && message) {
        await storage.createConversationMessage({
          serviceId,
          senderId: 1, // System/Admin user
          recipientPhone: phoneNumber,
          messageType: messageType as any,
          messageContent: message,
          messageDirection: 'outgoing',
          deliveryStatus: 'sent',
          mediaUrl
        });
        console.log(`📞 [CONVERSATION] ✅ Zabeležena WhatsApp poruka za servis #${serviceId}: ${phoneNumber}`);
      }
    } catch (error) {
      console.error('📞 [CONVERSATION] ❌ Greška pri logovanju conversation poruke:', error);
    }
  }

  // Kreiranje SMS servisa - trebamo da učitamo config iz storage
  async function getSMSService(): Promise<SMSMobileAPIService> {
    const settings = await storage.getAllSystemSettings();
    const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]));
    
    return new SMSMobileAPIService({
      apiKey: settingsMap.sms_mobile_api_key || '',
      baseUrl: settingsMap.sms_mobile_base_url || 'https://api.smsmobileapi.com',
      timeout: parseInt(settingsMap.sms_mobile_timeout || '10000') || 10000
    });
  }

  // GET /api/sms-mobile-api/status - Status SMS Mobile API servisa
  router.get('/status', jwtAuth, requireRole(['admin', 'technician']), async (req: Request, res: Response) => {
    try {
      const smsService = await getSMSService();
      const settings = await storage.getAllSystemSettings();
      const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]));
      
      const status = await smsService.testConnection();
      
      res.json({
        enabled: settingsMap.sms_mobile_enabled === 'true',
        configured: !!settingsMap.sms_mobile_api_key,
        baseUrl: settingsMap.sms_mobile_base_url || 'https://api.smsmobileapi.com',
        timeout: parseInt(settingsMap.sms_mobile_timeout || '10000') || 10000,
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
      const smsService = await getSMSService();
      const settings = await storage.getAllSystemSettings();
      const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]));
      
      // Ne vraćaj API ključ iz sigurnosnih razloga
      res.json({
        baseUrl: settingsMap.sms_mobile_base_url || 'https://api.smsmobileapi.com',
        timeout: parseInt(settingsMap.sms_mobile_timeout || '10000') || 10000,
        enabled: settingsMap.sms_mobile_enabled === 'true',
        hasApiKey: !!settingsMap.sms_mobile_api_key
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
      
      // Ažuriranje u bazi preko storage
      if (apiKey !== undefined) {
        await storage.updateSystemSetting('sms_mobile_api_key', apiKey);
      }
      if (baseUrl !== undefined) {
        await storage.updateSystemSetting('sms_mobile_base_url', baseUrl);
      }
      if (timeout !== undefined) {
        await storage.updateSystemSetting('sms_mobile_timeout', timeout.toString());
      }
      if (enabled !== undefined) {
        await storage.updateSystemSetting('sms_mobile_enabled', enabled.toString());
      }
      
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
      const smsService = await getSMSService();
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

  // POST /api/sms-mobile-api/whatsapp-with-image - Pošalji WhatsApp poruku sa slikom
  router.post('/whatsapp-with-image', jwtAuth, requireRole(['admin', 'technician']), async (req: Request, res: Response) => {
    try {
      const { phoneNumber, message, imageUrl, serviceId } = req.body;
      
      if (!phoneNumber || !message) {
        return res.status(400).json({
          success: false,
          error: 'Broj telefona i poruka su obavezni'
        });
      }

      if (!imageUrl) {
        return res.status(400).json({
          success: false,
          error: 'URL slike je obavezan za WhatsApp slanje sa slikom'
        });
      }
      
      const smsService = await getSMSService();
      const formattedPhone = smsService.formatPhoneNumber(phoneNumber);
      
      const smsRequest: SendSMSRequest = {
        recipients: formattedPhone,
        message: message,
        sendername: 'FrigoSistem',
        url_media: imageUrl,
        whatsappOnly: true // Samo WhatsApp za slanje slika
      };
      
      console.log(`📷 WhatsApp sa slikom: ${formattedPhone} - ${imageUrl}`);
      const result = await smsService.sendSMS(smsRequest);
      
      // Log aktivnost za servis ako je specificiran
      if (serviceId) {
        console.log(`📝 WhatsApp sa slikom poslat za servis #${serviceId}`);
      }
      
      if (result.error === 0 || result.error === '0' || (result.sent && result.sent > 0)) {
        // NOVO DODANO: Conversation logging za uspešno poslate WhatsApp poruke sa slikom
        if (serviceId) {
          await logConversationMessage(parseInt(serviceId), formattedPhone, message, 'whatsapp', imageUrl);
        }
        res.json({
          success: true,
          message: 'WhatsApp poruka sa slikom je uspešno poslata',
          details: result
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.details || 'Greška pri slanju WhatsApp poruke sa slikom',
          details: result
        });
      }
    } catch (error) {
      console.error('[SMS MOBILE API ROUTES] Greška pri slanju WhatsApp sa slikom:', error);
      res.status(500).json({
        success: false,
        error: 'Greška pri slanju WhatsApp poruke sa slikom'
      });
    }
  });

  // POST /api/sms-mobile-api/send - Pošalji SMS poruku
  router.post('/send', jwtAuth, requireRole(['admin', 'technician']), async (req: Request, res: Response) => {
    try {
      const { phoneNumber, message, sendWhatsApp, mediaUrl, whatsappOnly } = req.body;
      
      if (!phoneNumber || !message) {
        return res.status(400).json({
          success: false,
          error: 'Broj telefona i poruka su obavezni'
        });
      }
      
      const smsService = await getSMSService();
      
      // Formatiranje broja telefona
      const formattedPhone = smsService.formatPhoneNumber(phoneNumber);
      
      // Kreiranje zahteva
      const smsRequest: SendSMSRequest = {
        recipients: formattedPhone,
        message: message,
        sendername: 'FrigoSistem', // Dodaj sender ID
        url_media: mediaUrl || undefined,
        whatsappOnly: whatsappOnly === true || whatsappOnly === 'true'
      };
      
      const result = await smsService.sendSMS(smsRequest);
      
      if (result.error === 0 || result.error === '0' || (result.sent && result.sent > 0)) {
        // NOVO DODANO: Conversation logging za uspešno poslate WhatsApp poruke
        if (req.body.serviceId && (whatsappOnly || sendWhatsApp)) {
          await logConversationMessage(parseInt(req.body.serviceId), formattedPhone, message, 'whatsapp', mediaUrl);
        }
        res.json({
          success: true,
          message: 'Poruka je uspešno poslata',
          details: result
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.details || 'Greška pri slanju poruke',
          details: result
        });
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
      const { recipients, message, sendWhatsApp, mediaUrl, whatsappOnly } = req.body;
      
      if (!recipients || !Array.isArray(recipients) || recipients.length === 0 || !message) {
        return res.status(400).json({
          success: false,
          error: 'Lista brojeva telefona i poruka su obavezni'
        });
      }
      
      const smsService = await getSMSService();
      const results = [];
      
      for (const phoneNumber of recipients) {
        const formattedPhone = smsService.formatPhoneNumber(phoneNumber);
        
        const smsRequest: SendSMSRequest = {
          recipients: formattedPhone,
          message: message,
          sendername: 'FrigoSistem',
          url_media: mediaUrl || undefined,
          whatsappOnly: whatsappOnly === true || whatsappOnly === 'true'
        };
        
        const result = await smsService.sendSMS(smsRequest);
        results.push(result);
        
        // NOVO DODANO: Conversation logging za uspešno poslate bulk WhatsApp poruke
        if ((result.error === 0 || result.error === '0' || (result.sent && result.sent > 0)) && req.body.serviceId && (whatsappOnly || sendWhatsApp)) {
          await logConversationMessage(parseInt(req.body.serviceId), formattedPhone, message, 'whatsapp', mediaUrl);
        }
        
        // Kratka pauza između slanja
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const allSuccessful = results.every(r => r.error === 0 || r.error === '0' || (r.sent && r.sent > 0));
      const result = {
        success: allSuccessful,
        results: results,
        total: recipients.length,
        sent: results.filter(r => r.error === 0 || r.error === '0' || (r.sent && r.sent > 0)).length
      };
      
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