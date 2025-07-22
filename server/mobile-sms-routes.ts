// API rute za mobile SMS konfiguraciju i testiranje
import { Express, Request, Response } from "express";
import { getMobileSMSService } from "./mobile-sms-service";
import { IStorage } from "./storage";
import { jwtAuth, requireRole } from "./jwt-auth";

export function registerMobileSMSRoutes(app: Express, storage: IStorage) {
  
  // Test SMS slanja
  app.post('/api/mobile-sms/test', jwtAuth, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      const { phoneNumber, message } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          error: 'Broj telefona je obavezan'
        });
      }

      const mobileSMS = getMobileSMSService();
      if (!mobileSMS) {
        return res.status(500).json({
          success: false,
          error: 'Mobile SMS servis nije inicijalizovan'
        });
      }

      const result = await mobileSMS.sendTestSMS(phoneNumber, message);
      
      return res.json({
        success: result.success,
        message: result.success ? 'Test SMS uspešno poslat' : 'Neuspešno slanje test SMS-a',
        error: result.error,
        messageId: result.messageId,
        timestamp: result.timestamp
      });
    } catch (error: any) {
      console.error('Greška pri test SMS slanju:', error);
      return res.status(500).json({
        success: false,
        error: 'Serverska greška pri slanju test SMS-a'
      });
    }
  });

  // Provera statusa gateway-a
  app.get('/api/mobile-sms/status', jwtAuth, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      const mobileSMS = getMobileSMSService();
      if (!mobileSMS) {
        return res.json({
          enabled: false,
          connected: false,
          error: 'Mobile SMS servis nije inicijalizovan'
        });
      }

      const status = await mobileSMS.checkGatewayStatus();
      
      return res.json({
        enabled: mobileSMS.enabled,
        connected: status.connected,
        error: status.error,
        gatewayInfo: status.gatewayInfo
      });
    } catch (error: any) {
      console.error('Greška pri proveri statusa:', error);
      return res.status(500).json({
        enabled: false,
        connected: false,
        error: 'Serverska greška pri proveri statusa'
      });
    }
  });

  // Dohvatanje konfiguracije
  app.get('/api/mobile-sms/config', jwtAuth, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      const allSettings = await storage.getAllSystemSettings();
      const smsSettings = allSettings.filter(s => s.category === 'mobile_sms');
      
      const config = {
        gatewayIP: smsSettings.find(s => s.key === 'mobile_sms_gateway_ip')?.value || '',
        gatewayPort: parseInt(smsSettings.find(s => s.key === 'mobile_sms_gateway_port')?.value || '8080'),
        apiKey: smsSettings.find(s => s.key === 'mobile_sms_api_key')?.value || '',
        timeout: parseInt(smsSettings.find(s => s.key === 'mobile_sms_timeout')?.value || '10000'),
        enabled: smsSettings.find(s => s.key === 'mobile_sms_enabled')?.value === 'true'
      };
      
      return res.json(config);
    } catch (error: any) {
      console.error('Greška pri dohvatanju konfiguracije:', error);
      return res.status(500).json({
        error: 'Serverska greška pri dohvatanju konfiguracije'
      });
    }
  });

  // Ažuriranje konfiguracije
  app.post('/api/mobile-sms/config', jwtAuth, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      const { gatewayIP, gatewayPort, apiKey, timeout, enabled } = req.body;
      const userId = (req as any).user.id;

      // Validacija
      if (!gatewayIP && enabled) {
        return res.status(400).json({
          error: 'IP adresa gateway-a je obavezna kada je servis omogućen'
        });
      }

      if (gatewayPort && (gatewayPort < 1 || gatewayPort > 65535)) {
        return res.status(400).json({
          error: 'Port mora biti između 1 i 65535'
        });
      }

      // Ažuriranje postavki
      const updates = [
        { key: 'mobile_sms_gateway_ip', value: gatewayIP || '' },
        { key: 'mobile_sms_gateway_port', value: String(gatewayPort || 8080) },
        { key: 'mobile_sms_api_key', value: apiKey || '' },
        { key: 'mobile_sms_timeout', value: String(timeout || 10000) },
        { key: 'mobile_sms_enabled', value: String(enabled || false) }
      ];

      for (const update of updates) {
        await storage.updateSystemSetting(update.key, update.value);
      }

      // Reinicijalizacija mobile SMS servisa
      const mobileSMS = getMobileSMSService();
      if (mobileSMS) {
        await mobileSMS.reinitialize();
      }

      return res.json({
        success: true,
        message: 'Konfiguracija je uspešno ažurirana'
      });
    } catch (error: any) {
      console.error('Greška pri ažuriranju konfiguracije:', error);
      return res.status(500).json({
        error: 'Serverska greška pri ažuriranju konfiguracije'
      });
    }
  });

  // Slanje SMS notifikacije o servisu (za interno korišćenje)
  app.post('/api/mobile-sms/service-notification', jwtAuth, requireRole(['admin', 'technician']), async (req: Request, res: Response) => {
    try {
      const { serviceId, phoneNumber, notificationType } = req.body;
      
      if (!serviceId || !phoneNumber || !notificationType) {
        return res.status(400).json({
          success: false,
          error: 'ServiceId, phoneNumber i notificationType su obavezni'
        });
      }

      const mobileSMS = getMobileSMSService();
      if (!mobileSMS) {
        return res.status(500).json({
          success: false,
          error: 'Mobile SMS servis nije inicijalizovan'
        });
      }

      const result = await mobileSMS.sendServiceNotification(serviceId, phoneNumber, notificationType);
      
      return res.json({
        success: result.success,
        message: result.success ? 'SMS notifikacija uspešno poslata' : 'Neuspešno slanje SMS notifikacije',
        error: result.error,
        messageId: result.messageId,
        timestamp: result.timestamp
      });
    } catch (error: any) {
      console.error('Greška pri slanju SMS notifikacije:', error);
      return res.status(500).json({
        success: false,
        error: 'Serverska greška pri slanju SMS notifikacije'
      });
    }
  });

  // Grupno slanje SMS poruka
  app.post('/api/mobile-sms/bulk', jwtAuth, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      const { messages } = req.body;
      
      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Lista poruka mora biti nerazgovetni niz sa najmanje jednom porukom'
        });
      }

      // Validacija svake poruke
      for (const msg of messages) {
        if (!msg.phoneNumber || !msg.message) {
          return res.status(400).json({
            success: false,
            error: 'Svaka poruka mora imati phoneNumber i message'
          });
        }
      }

      const mobileSMS = getMobileSMSService();
      if (!mobileSMS) {
        return res.status(500).json({
          success: false,
          error: 'Mobile SMS servis nije inicijalizovan'
        });
      }

      const results = await mobileSMS.sendBulkSMS(messages);
      const successCount = results.filter(r => r.success).length;
      
      return res.json({
        success: successCount > 0,
        message: `Grupno slanje završeno: ${successCount}/${results.length} uspešno`,
        results: results,
        totalSent: messages.length,
        successCount: successCount,
        failureCount: results.length - successCount
      });
    } catch (error: any) {
      console.error('Greška pri grupnom slanju SMS-a:', error);
      return res.status(500).json({
        success: false,
        error: 'Serverska greška pri grupnom slanju SMS-a'
      });
    }
  });
}