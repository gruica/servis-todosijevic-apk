// SMS test script
import { SMSCommunicationService } from './server/sms-communication-service.js';

async function testSMS() {
  try {
    console.log('🧪 Testiranje SMS funkcionalnosti za Bojanu Pepić...');
    
    // SMS konfiguracija iz baze (kao što je u routes.ts)
    const smsConfig = {
      apiKey: '3153ca534ac7ad8dcdbc21758c7d3af1313e50357f5b7eff',
      baseUrl: 'https://api.smsmobileapi.com',
      senderId: null, // Šalje se broj umesto imena
      enabled: true
    };
    
    // Kreiraj SMS servis
    const smsService = new SMSCommunicationService(smsConfig);
    
    console.log(`🔧 SMS isConfigured: ${smsService.isConfigured()}`);
    
    if (!smsService.isConfigured()) {
      console.error('❌ SMS servis nije konfigurisan!');
      return;
    }
    
    // Test SMS za Bojanu Pepić
    console.log('📱 Slanje SMS obaveštenja za završetak servisa...');
    
    const result = await smsService.notifyClientStatusUpdate({
      clientPhone: '381641225153',
      clientName: 'Bojana Pepić',
      serviceId: '234',
      deviceType: 'Frižider',
      statusDescription: 'Završen',
      technicianNotes: 'Frižider popravljen, led je uklonjen, hlađenje funkcioniše normalno'
    });
    
    if (result.success) {
      console.log('✅ SMS USPEŠNO POSLAT!');
      console.log(`📧 Message ID: ${result.messageId}`);
      console.log(`📝 Detalji: ${result.details || 'N/A'}`);
    } else {
      console.log('❌ SMS NIJE POSLAT');
      console.log(`🚫 Greška: ${result.error}`);
      console.log(`📝 Detalji: ${result.details || 'N/A'}`);
    }
    
  } catch (error) {
    console.error('💥 Greška pri testiranju SMS-a:', error);
  }
}

testSMS();