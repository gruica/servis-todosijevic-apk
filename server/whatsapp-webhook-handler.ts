import type { Request, Response } from 'express';
import { whatsappBusinessAPIService } from './whatsapp-business-api-service';
import { findAutoReply, AUTO_REPLIES, EMERGENCY_TEMPLATES, MONTENEGRO_FORMATTING } from '../shared/whatsapp-templates';

/**
 * WhatsApp Webhook Handler - NOVI SISTEM
 * Handluje webhook pozive od Facebook WhatsApp Business API
 * DODATO: Ne dira postojeći kod, samo novi webhook sistem
 */

export interface WhatsAppWebhookEntry {
  id: string;
  changes: Array<{
    value: {
      messaging_product: 'whatsapp';
      metadata: {
        display_phone_number: string;
        phone_number_id: string;
      };
      contacts?: Array<{
        profile: {
          name: string;
        };
        wa_id: string;
      }>;
      messages?: Array<{
        from: string;
        id: string;
        timestamp: string;
        text?: {
          body: string;
        };
        type: string;
      }>;
      statuses?: Array<{
        id: string;
        status: 'sent' | 'delivered' | 'read' | 'failed';
        timestamp: string;
        recipient_id: string;
      }>;
    };
    field: string;
  }>;
}

export interface WhatsAppWebhookPayload {
  object: 'whatsapp_business_account';
  entry: WhatsAppWebhookEntry[];
}

/**
 * Webhook verifikacija - GET endpoint
 * Facebook poziva ovo da verifikuje webhook URL
 */
export async function verifyWebhook(req: Request, res: Response): Promise<void> {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('🔐 [WEBHOOK VERIFY] Verifikacija webhook-a:', {
      mode,
      token: token ? 'present' : 'missing',
      challenge: challenge ? 'present' : 'missing'
    });

    // Proverava mode i token
    if (mode === 'subscribe' && token) {
      // Ovde treba da se postavi VERIFY_TOKEN iz environment varijable ili konfiguracije
      const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'frigo_sistem_todosijevic_webhook_2024';
      
      if (token === VERIFY_TOKEN) {
        console.log('✅ [WEBHOOK VERIFY] Webhook uspešno verifikovan');
        res.status(200).send(challenge);
        return;
      } else {
        console.log('❌ [WEBHOOK VERIFY] Nevaljan verify token');
        res.status(403).send('Forbidden');
        return;
      }
    }

    console.log('❌ [WEBHOOK VERIFY] Nevalidni parametri za verifikaciju');
    res.status(400).send('Bad Request');
  } catch (error) {
    console.error('❌ [WEBHOOK VERIFY] Greška pri verifikaciji:', error);
    res.status(500).send('Internal Server Error');
  }
}

/**
 * Webhook handler - POST endpoint  
 * Facebook šalje ovde notifikacije o porukami, status ažuriranjima itd.
 */
export async function handleWebhook(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body as WhatsAppWebhookPayload;

    console.log('📨 [WEBHOOK] Primljen webhook poziv:', JSON.stringify(body, null, 2));

    // Brzo odgovaranje Facebook-u da je webhook primljen
    res.status(200).send('OK');

    // Procesiranje webhook-a asinhrono
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry) {
        await processWebhookEntry(entry);
      }
    }

  } catch (error) {
    console.error('❌ [WEBHOOK] Greška pri procesiranju webhook-a:', error);
    res.status(200).send('OK'); // Uvek vraćamo OK da Facebook ne retryuje
  }
}

/**
 * Procesiranje pojedinačnog webhook entry-ja
 */
async function processWebhookEntry(entry: WhatsAppWebhookEntry): Promise<void> {
  try {
    console.log(`🔄 [WEBHOOK] Procesiranje entry: ${entry.id}`);

    for (const change of entry.changes) {
      if (change.field === 'messages') {
        await processMessages(change.value);
      } else if (change.field === 'message_status') {
        await processMessageStatuses(change.value);
      }
    }

  } catch (error) {
    console.error('❌ [WEBHOOK] Greška pri procesiranju entry-ja:', error);
  }
}

/**
 * Procesiranje dolaznih poruka
 */
async function processMessages(value: any): Promise<void> {
  try {
    const { messages, contacts } = value;
    
    if (!messages || messages.length === 0) {
      console.log('📭 [WEBHOOK] Nema novih poruka za procesiranje');
      return;
    }

    for (const message of messages) {
      console.log(`📩 [WEBHOOK] Nova poruka od ${message.from}:`, {
        id: message.id,
        type: message.type,
        text: message.text?.body || 'N/A',
        timestamp: message.timestamp
      });

      // Ovde možete dodati logiku za čuvanje poruka u bazu
      // ili automatske odgovore
      
      // Primer: Automatski odgovor
      if (message.text?.body?.toLowerCase().includes('help') || 
          message.text?.body?.toLowerCase().includes('pomoć')) {
        
        await sendAutomaticReply(message.from, `Hvala na poruci! 
Ovo je automatski odgovor Frigo Sistem Todosijević.
Za hitne servise pozovite: 067051141

Radimo od ponedeljka do petka 08:00-17:00h.`);
      }
    }

  } catch (error) {
    console.error('❌ [WEBHOOK] Greška pri procesiranju poruka:', error);
  }
}

/**
 * Procesiranje status ažuriranja poruka
 */
async function processMessageStatuses(value: any): Promise<void> {
  try {
    const { statuses } = value;
    
    if (!statuses || statuses.length === 0) {
      return;
    }

    for (const status of statuses) {
      console.log(`📊 [WEBHOOK] Status ažuriranje:`, {
        messageId: status.id,
        status: status.status,
        recipient: status.recipient_id,
        timestamp: status.timestamp
      });

      // Ovde možete dodati logiku za ažuriranje statusa poruka u bazi
    }

  } catch (error) {
    console.error('❌ [WEBHOOK] Greška pri procesiranju statusa:', error);
  }
}

/**
 * Šalje automatski odgovor
 */
async function sendAutomaticReply(phoneNumber: string, message: string): Promise<void> {
  try {
    console.log(`🤖 [WEBHOOK] Šalje automatski odgovor za ${phoneNumber}`);
    
    const result = await whatsappBusinessAPIService.sendTextMessage(phoneNumber, message);
    
    if (result.success) {
      console.log(`✅ [WEBHOOK] Automatski odgovor poslat: ${result.messageId}`);
    } else {
      console.log(`❌ [WEBHOOK] Automatski odgovor neuspešan: ${result.error}`);
    }

  } catch (error) {
    console.error('❌ [WEBHOOK] Greška pri slanju automatskog odgovora:', error);
  }
}

/**
 * Dobija trenutnu konfiguraciju webhook-a
 */
export function getWebhookConfig(): {
  verifyToken: string;
  isConfigured: boolean;
} {
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'frigo_sistem_todosijevic_webhook_2024';
  
  return {
    verifyToken,
    isConfigured: !!verifyToken
  };
}