import axios, { AxiosResponse } from 'axios';

export interface WhatsAppBusinessAPIConfig {
  accessToken: string;
  phoneNumberId: string;
  apiVersion?: string;
  baseUrl?: string;
}

export interface WhatsAppBusinessMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'text' | 'template' | 'interactive' | 'image' | 'document';
  text?: {
    body: string;
    preview_url?: boolean;
  };
  template?: {
    name: string;
    language: {
      code: string;
    };
    components?: any[];
  };
  interactive?: any;
  image?: {
    link: string;
    caption?: string;
  };
  document?: {
    link: string;
    filename?: string;
  };
}

export interface WhatsAppBusinessAPIResponse {
  messaging_product: string;
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
  }>;
}

export interface WhatsAppBusinessAPIError {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id: string;
  };
}

/**
 * WhatsApp Business API Service - Facebook Cloud API Integration
 * NOVI SERVIS - dodano paralelno sa postojećim WhatsApp Web sistemom
 */
export class WhatsAppBusinessAPIService {
  private config: WhatsAppBusinessAPIConfig;
  private baseUrl: string;
  private isConfigured: boolean = false;

  constructor(config?: WhatsAppBusinessAPIConfig) {
    this.config = config || {
      accessToken: '',
      phoneNumberId: '',
      apiVersion: 'v23.0'
    };
    this.baseUrl = this.config.baseUrl || 'https://graph.facebook.com';
    this.isConfigured = !!(this.config.accessToken && this.config.phoneNumberId);
  }

  /**
   * Ažurira konfiguraciju servisa
   */
  updateConfig(config: WhatsAppBusinessAPIConfig): void {
    this.config = { ...this.config, ...config };
    this.baseUrl = this.config.baseUrl || 'https://graph.facebook.com';
    this.isConfigured = !!(this.config.accessToken && this.config.phoneNumberId);
    console.log('🔧 [WHATSAPP BUSINESS API] Konfiguracija ažurirana:', {
      hasAccessToken: !!this.config.accessToken,
      phoneNumberId: this.config.phoneNumberId,
      apiVersion: this.config.apiVersion,
      isConfigured: this.isConfigured
    });
  }

  /**
   * Proverava da li je servis pravilno konfigurisan
   */
  getConfigurationStatus(): { isConfigured: boolean; missingFields: string[] } {
    const missingFields: string[] = [];
    
    if (!this.config.accessToken) {
      missingFields.push('accessToken');
    }
    if (!this.config.phoneNumberId) {
      missingFields.push('phoneNumberId');
    }

    return {
      isConfigured: this.isConfigured,
      missingFields
    };
  }

  /**
   * Formatira broj telefona za WhatsApp Business API
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Ukloni sve što nije broj
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Ako počinje sa 0, zameni sa 381 (Srbija)
    if (cleaned.startsWith('0')) {
      cleaned = '381' + cleaned.substring(1);
    }
    
    // Ako ne počinje sa zemljom, dodaj 381
    if (!cleaned.startsWith('381')) {
      cleaned = '381' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Šalje tekstualnu poruku
   */
  async sendTextMessage(
    phoneNumber: string, 
    message: string, 
    previewUrl: boolean = false
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.isConfigured) {
        return { success: false, error: 'WhatsApp Business API nije konfigurisan' };
      }

      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      
      const payload: WhatsAppBusinessMessage = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'text',
        text: {
          body: message,
          preview_url: previewUrl
        }
      };

      const response = await this.sendMessage(payload);
      
      if (response.success && response.data?.messages?.[0]?.id) {
        console.log(`✅ [WHATSAPP BUSINESS API] Tekstualna poruka poslata na ${formattedPhone}: ${message.substring(0, 50)}...`);
        return {
          success: true,
          messageId: response.data.messages[0].id
        };
      }

      return { success: false, error: response.error || 'Nepoznata greška' };

    } catch (error: any) {
      console.error('❌ [WHATSAPP BUSINESS API] Greška pri slanju tekstualne poruke:', error);
      return {
        success: false,
        error: error.message || 'Greška pri slanju poruke'
      };
    }
  }

  /**
   * Šalje template poruku
   */
  async sendTemplateMessage(
    phoneNumber: string,
    templateName: string,
    languageCode: string = 'en_US',
    components?: any[]
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.isConfigured) {
        return { success: false, error: 'WhatsApp Business API nije konfigurisan' };
      }

      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      
      const payload: WhatsAppBusinessMessage = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: languageCode
          },
          components: components || []
        }
      };

      const response = await this.sendMessage(payload);
      
      if (response.success && response.data?.messages?.[0]?.id) {
        console.log(`✅ [WHATSAPP BUSINESS API] Template poruka poslata na ${formattedPhone}: ${templateName}`);
        return {
          success: true,
          messageId: response.data.messages[0].id
        };
      }

      return { success: false, error: response.error || 'Nepoznata greška' };

    } catch (error: any) {
      console.error('❌ [WHATSAPP BUSINESS API] Greška pri slanju template poruke:', error);
      return {
        success: false,
        error: error.message || 'Greška pri slanju template poruke'
      };
    }
  }

  /**
   * Šalje sliku sa porukom
   */
  async sendImageMessage(
    phoneNumber: string,
    imageUrl: string,
    caption?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.isConfigured) {
        return { success: false, error: 'WhatsApp Business API nije konfigurisan' };
      }

      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      
      const payload: WhatsAppBusinessMessage = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'image',
        image: {
          link: imageUrl,
          caption: caption
        }
      };

      const response = await this.sendMessage(payload);
      
      if (response.success && response.data?.messages?.[0]?.id) {
        console.log(`✅ [WHATSAPP BUSINESS API] Slika poslata na ${formattedPhone}: ${imageUrl}`);
        return {
          success: true,
          messageId: response.data.messages[0].id
        };
      }

      return { success: false, error: response.error || 'Nepoznata greška' };

    } catch (error: any) {
      console.error('❌ [WHATSAPP BUSINESS API] Greška pri slanju slike:', error);
      return {
        success: false,
        error: error.message || 'Greška pri slanju slike'
      };
    }
  }

  /**
   * Osnovna metoda za slanje bilo kog tipa poruke
   */
  private async sendMessage(payload: WhatsAppBusinessMessage): Promise<{
    success: boolean;
    data?: WhatsAppBusinessAPIResponse;
    error?: string;
  }> {
    try {
      const url = `${this.baseUrl}/${this.config.apiVersion}/${this.config.phoneNumberId}/messages`;
      
      const headers = {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json'
      };

      console.log(`📱 [WHATSAPP BUSINESS API] Šalje poruku na: ${url}`);
      console.log(`📝 [WHATSAPP BUSINESS API] Payload:`, JSON.stringify(payload, null, 2));

      const response: AxiosResponse<WhatsAppBusinessAPIResponse | WhatsAppBusinessAPIError> = await axios.post(
        url,
        payload,
        { headers }
      );

      if (response.status === 200) {
        const data = response.data as WhatsAppBusinessAPIResponse;
        console.log(`✅ [WHATSAPP BUSINESS API] Poruka uspešno poslata:`, data);
        return {
          success: true,
          data
        };
      }

      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      };

    } catch (error: any) {
      console.error('❌ [WHATSAPP BUSINESS API] Axios greška:', error);
      
      if (error.response?.data?.error) {
        const fbError = error.response.data as WhatsAppBusinessAPIError;
        return {
          success: false,
          error: `Facebook API Error: ${fbError.error.message} (Code: ${fbError.error.code})`
        };
      }

      return {
        success: false,
        error: error.message || 'Nepoznata greška'
      };
    }
  }

  /**
   * Testira konekciju sa WhatsApp Business API
   */
  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      if (!this.isConfigured) {
        return {
          success: false,
          message: 'WhatsApp Business API nije konfigurisan. Nedostaju accessToken ili phoneNumberId.'
        };
      }

      // Pokušaj da dobije informacije o phone number-u
      const url = `${this.baseUrl}/${this.config.apiVersion}/${this.config.phoneNumberId}`;
      
      const headers = {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json'
      };

      const response = await axios.get(url, { headers });

      if (response.status === 200) {
        return {
          success: true,
          message: 'WhatsApp Business API konekcija uspešna!',
          details: response.data
        };
      }

      return {
        success: false,
        message: `Test konekcije neuspešan: HTTP ${response.status}`
      };

    } catch (error: any) {
      console.error('❌ [WHATSAPP BUSINESS API] Test konekcije neuspešan:', error);
      
      if (error.response?.data?.error) {
        const fbError = error.response.data as WhatsAppBusinessAPIError;
        return {
          success: false,
          message: `Facebook API Error: ${fbError.error.message} (Code: ${fbError.error.code})`,
          details: fbError.error
        };
      }

      return {
        success: false,
        message: error.message || 'Test konekcije neuspešan'
      };
    }
  }

  /**
   * TEMPLATE FUNKCIJE ZA AUTOMATSKA OBAVEŠTENJA - KOMPATIBILNE SA POSTOJEĆIM SISTEMOM
   */

  /**
   * Šalje obaveštenje klijentu o završenom servisu preko Business API
   */
  async notifyServiceCompleted(serviceData: {
    clientPhone: string;
    clientName: string;
    serviceId: string;
    deviceType: string;
    deviceModel: string;
    technicianName: string;
    completedDate: string;
    usedParts?: string;
    machineNotes?: string;
    cost?: string;
    isCompletelyFixed: boolean;
    warrantyStatus: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    
    const message = `🎉 *SERVIS ZAVRŠEN*

Poštovani ${serviceData.clientName},
Vaš servis je uspešno završen!

📋 *Detalji servisa:*
• Servis ID: #${serviceData.serviceId}
• Uređaj: ${serviceData.deviceType} - ${serviceData.deviceModel}
• Datum završetka: ${serviceData.completedDate}
• Serviser: ${serviceData.technicianName}
• Status: ${serviceData.isCompletelyFixed ? '✅ Potpuno popravljen' : '⚠️ Delimično popravljen'}
• Garancija: ${serviceData.warrantyStatus}

${serviceData.usedParts ? `🔧 *Korišćeni delovi:*\n${serviceData.usedParts}\n\n` : ''}${serviceData.machineNotes ? `📝 *Napomene:*\n${serviceData.machineNotes}\n\n` : ''}${serviceData.cost ? `💰 *Troškovi:* ${serviceData.cost} RSD\n\n` : ''}Hvala što ste odabrali Frigo Sistem Todosijević!
📞 Za dodatne informacije: 067051141`;

    return await this.sendTextMessage(serviceData.clientPhone, message);
  }

  /**
   * Šalje obaveštenje administratoru o završenom servisu
   */
  async notifyAdminServiceCompleted(serviceData: {
    adminPhone: string;
    serviceId: string;
    clientName: string;
    clientPhone: string;
    deviceType: string;
    deviceModel: string;
    technicianName: string;
    completedDate: string;
    usedParts?: string;
    cost?: string;
    isCompletelyFixed: boolean;
    warrantyStatus: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    
    const message = `🎯 *SERVIS ZAVRŠEN - ADMIN OBAVEŠTENJE*

Serviser ${serviceData.technicianName} je završio servis.

📋 *Detalji:*
• ID: #${serviceData.serviceId}
• Klijent: ${serviceData.clientName} (${serviceData.clientPhone})
• Uređaj: ${serviceData.deviceType} - ${serviceData.deviceModel}
• Serviser: ${serviceData.technicianName}
• Status: ${serviceData.isCompletelyFixed ? 'Potpuno popravljen' : 'Delimično popravljen'}
• Garancija: ${serviceData.warrantyStatus}
${serviceData.cost ? `• Troškovi: ${serviceData.cost} RSD` : ''}
${serviceData.usedParts ? `• Delovi: ${serviceData.usedParts}` : ''}

⏰ Završeno: ${serviceData.completedDate}`;

    return await this.sendTextMessage(serviceData.adminPhone, message);
  }

  /**
   * Bulk slanje poruka - šalje istu poruku više primaoca
   */
  async sendBulkMessages(
    phoneNumbers: string[],
    message: string
  ): Promise<Array<{ phone: string; success: boolean; messageId?: string; error?: string }>> {
    const results: Array<{ phone: string; success: boolean; messageId?: string; error?: string }> = [];

    for (const phone of phoneNumbers) {
      try {
        const result = await this.sendTextMessage(phone, message);
        results.push({
          phone,
          success: result.success,
          messageId: result.messageId,
          error: result.error
        });

        // Kratka pauza između poruka da ne preopteretimo API (rate limit je 80/sec)
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error: any) {
        results.push({
          phone,
          success: false,
          error: error.message || 'Nepoznata greška'
        });
      }
    }

    return results;
  }

  /**
   * Dobija trenutnu konfiguraciju (bez otkrivanja access token-a)
   */
  getCurrentConfig(): { 
    phoneNumberId: string; 
    apiVersion: string; 
    baseUrl: string; 
    hasAccessToken: boolean; 
    isConfigured: boolean 
  } {
    return {
      phoneNumberId: this.config.phoneNumberId,
      apiVersion: this.config.apiVersion || 'v23.0',
      baseUrl: this.baseUrl,
      hasAccessToken: !!this.config.accessToken,
      isConfigured: this.isConfigured
    };
  }
}

// Singleton instanca za upotrebu kroz aplikaciju
export const whatsappBusinessAPIService = new WhatsAppBusinessAPIService();