import { EmailService } from './server/email-service.js';
import { PostgresStorage } from './server/storage.js';

console.log('🧪 DIREKTNI TEST BEKO CUSTOMER REFUSAL EMAIL SISTEMA');
console.log('====================================================');

async function testBekoCustomerRefusalEmail() {
  try {
    // Kreiranje storage instance
    const storage = new PostgresStorage();
    
    // Kreiranje email service instance
    const emailService = new EmailService();
    
    console.log('📧 Kreiranje email service...');
    
    // Uzimanje podataka o servisu 164 (test Beko servis)
    console.log('🔍 Dohvatanje podataka o test servisu...');
    const service = await storage.getService(164);
    
    if (!service) {
      console.log('❌ Test servis sa ID 164 nije pronađen');
      return;
    }
    
    console.log('✅ Servis pronađen:', {
      id: service.id,
      status: service.status,
      customerRefusalReason: service.customerRefusalReason
    });
    
    // Dohvatanje client podataka
    const client = await storage.getClient(service.clientId);
    console.log('✅ Klijent pronađen:', {
      name: client.fullName,
      email: client.email
    });
    
    // Dohvatanje appliance podataka
    const appliance = await storage.getAppliance(service.applianceId);
    const category = await storage.getApplianceCategory(appliance.categoryId);
    const manufacturer = await storage.getManufacturer(appliance.manufacturerId);
    
    console.log('✅ Aparat pronađen:', {
      manufacturer: manufacturer.name,
      category: category.name,
      model: appliance.model
    });
    
    // Test standardni customer refusal email
    console.log('');
    console.log('📧 Slanje standardnog customer refusal email-a...');
    
    const result1 = await emailService.sendCustomerRefusalNotification(
      service,
      client,
      appliance,
      category,
      manufacturer,
      service.customerRefusalReason
    );
    
    console.log(`📊 Standardni email result: ${result1 ? 'USPEŠNO' : 'NEUSPEŠNO'}`);
    
    // Test Beko specijalni customer refusal email
    if (manufacturer.name.toLowerCase() === 'beko') {
      console.log('');
      console.log('📧 Slanje specijalnog Beko business email-a...');
      
      const result2 = await emailService.sendBekoCustomerRefusalNotification(
        service,
        client,
        appliance,
        category,
        manufacturer,
        service.customerRefusalReason
      );
      
      console.log(`📊 Beko business email result: ${result2 ? 'USPEŠNO' : 'NEUSPEŠNO'}`);
      
      console.log('');
      console.log('✅ SVEUKUPNI REZULTAT: Testiran kompletni Beko customer refusal workflow');
      console.log('📧 Email adrese koje su trebale primiti poruke:');
      console.log('   1. gruica@icloud.com (klijent)');
      console.log('   2. jelena@frigosistemtodosijevic.com (Beko business)');
      console.log('   3. mp4@eurotehnikamn.me (Beko business)');
    } else {
      console.log('⚠️ Aparat nije Beko - samo standardni email poslan');
    }
    
  } catch (error) {
    console.error('❌ Greška tokom testa:', error.message);
    console.error('📄 Stack trace:', error.stack);
  }
}

// Pokretanje testa
testBekoCustomerRefusalEmail();