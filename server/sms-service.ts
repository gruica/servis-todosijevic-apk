import twilio from 'twilio';

// Twilio SMS servisi instance (postojeća implementacija)
let twilioClient: twilio.Twilio | null = null;

// Kreiranje Twilio klijenta
function createTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  if (!accountSid || !authToken) {
    console.warn("[SMS DEBUG] Twilio credentials nisu disponiljni");
    return null;
  }
  
  console.log(`[SMS DEBUG] Provera Twilio kredencijala: accountSid: ${accountSid?.substring(0, 6)}... authToken: ${authToken ? 'postoji' : 'ne postoji'} phone: ${process.env.TWILIO_PHONE_NUMBER}`);
  
  try {
    console.log("[SMS DEBUG] Pokušaj inicijalizacije Twilio klijenta");
    const client = twilio(accountSid, authToken);
    return client;
  } catch (error) {
    console.error("[SMS DEBUG] Greška pri inicijalizaciji Twilio klijenta:", error);
    return null;
  }
}

// Inicijalizuj Twilio klijent
twilioClient = createTwilioClient();

if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
  console.log(`[SMS] SMS servis uspešno inicijalizovan sa brojem: ${process.env.TWILIO_PHONE_NUMBER}`);
} else {
  console.warn("[SMS] SMS servis nije konfigurisan - proverite Twilio credentials");
}

// Interface za klijenta i servis
interface Client {
  fullName: string;
  phone?: string | null;
}

interface Service {
  id: number;
  description: string;
  status: string;
}

// SMS Service klasa (postojeća Twilio implementacija)
export class SmsService {
  async sendServiceStatusUpdate(
    client: Client,
    service: Service,
    newStatus: string,
    technicianName?: string | null
  ): Promise<boolean> {
    if (!twilioClient || !process.env.TWILIO_PHONE_NUMBER) {
      console.warn("[SMS] SMS servis nije konfigurisan - preskačem slanje");
      return false;
    }

    if (!client.phone) {
      console.warn(`[SMS] Klijent ${client.fullName} nema broj telefona - preskačem SMS`);
      return false;
    }

    try {
      let message = '';
      
      switch (newStatus) {
        case 'assigned':
          message = `Frigo Sistem: Vaš servis #${service.id} je dodeljen serviseru ${technicianName || ''}. Kontakt telefon: 033 402 402`;
          break;
        case 'scheduled':
          message = `Frigo Sistem: Zakazan je termin za servis #${service.id}. Kontakt telefon: 033 402 402`;
          break;
        case 'in_progress':
          message = `Frigo Sistem: Servis #${service.id} je u toku. Kontakt telefon: 033 402 402`;
          break;
        case 'completed':
          message = `Frigo Sistem: Servis #${service.id} je završen. Kontakt telefon: 033 402 402`;
          break;
        default:
          message = `Frigo Sistem: Status servisa #${service.id} je ažuriran. Kontakt telefon: 033 402 402`;
      }

      console.log(`[SMS] Slanje SMS poruke klijentu ${client.fullName} (${client.phone}): ${message}`);

      const smsResponse = await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: client.phone
      });

      console.log(`[SMS] ✅ SMS uspešno poslat. SID: ${smsResponse.sid}`);
      return true;

    } catch (error) {
      console.error(`[SMS] ❌ Greška pri slanju SMS poruke klijentu ${client.fullName}:`, error);
      return false;
    }
  }

  async sendMaintenanceReminder(
    client: Client,
    appliance: { model: string; category: { name: string } },
    scheduledDate: Date
  ): Promise<boolean> {
    if (!twilioClient || !process.env.TWILIO_PHONE_NUMBER) {
      console.warn("[SMS] SMS servis nije konfigurisan - preskačem slanje");
      return false;
    }

    if (!client.phone) {
      console.warn(`[SMS] Klijent ${client.fullName} nema broj telefona - preskačem SMS`);
      return false;
    }

    try {
      const dateStr = scheduledDate.toLocaleDateString('sr-Latn-ME');
      const message = `Frigo Sistem: Podsetnik za održavanje - ${appliance.category.name} ${appliance.model} zakazano za ${dateStr}. Kontakt telefon: 033 402 402`;

      console.log(`[SMS] Slanje podsetnika za održavanje klijentu ${client.fullName} (${client.phone})`);

      const smsResponse = await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: client.phone
      });

      console.log(`[SMS] ✅ Podsetnik uspešno poslat. SID: ${smsResponse.sid}`);
      return true;

    } catch (error) {
      console.error(`[SMS] ❌ Greška pri slanju podsetnika klijentu ${client.fullName}:`, error);
      return false;
    }
  }
}

// Eksportuj singleton instancu
export const smsService = new SmsService();