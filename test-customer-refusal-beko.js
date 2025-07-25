// Koristim postojeću PostgreSQL konekciju
import pkg from 'pg';
const { Pool } = pkg;

// Kreiraću direktno test poziv kroz curl na API endpoint
const testData = {
  serviceId: 999,
  status: "customer_refused_repair",
  customerRefusalReason: "Previsoka cena popravke - klijent neće da plati",
  technicianNotes: "Test customer refusal za Beko aparat"
};

// Test podatci za klijenta
const testClient = {
  id: 999,
  fullName: "Test Klijent",
  email: "gruica@icloud.com",
  phone: "067123456",
  address: "Test adresa 123",
  city: "Kotor"
};

// Test parametri
const serviceId = 999;
const applianceName = "Frižider";
const refusalReason = "Previsoka cena popravke - klijent neće da plati";
const technicianName = "Gruica Milošević";
const manufacturerName = "Beko";

console.log('🧪 TESTIRANJE BEKO CUSTOMER REFUSAL EMAIL SISTEMA');
console.log('===================================================');
console.log(`📧 Slanje test email-a na: ${testClient.email}`);
console.log(`🔧 Servis: #${serviceId} - ${applianceName} (${manufacturerName})`);
console.log(`❌ Razlog odbijanja: ${refusalReason}`);
console.log(`👨‍🔧 Serviser: ${technicianName}`);
console.log('');

try {
  const emailService = new EmailService();
  
  // Test 1: Standardni customer refusal email za klijenta
  console.log('1️⃣ Šaljem standardni customer refusal email klijentu...');
  const customerEmailResult = await emailService.sendCustomerRefusalNotification(
    testClient,
    serviceId,
    applianceName,
    refusalReason,
    technicianName
  );
  console.log(`   Rezultat: ${customerEmailResult ? '✅ USPEŠNO' : '❌ NEUSPEŠNO'}`);
  
  // Test 2: Specijalni Beko business email
  console.log('2️⃣ Šaljem specijalni Beko business email...');
  const bekoEmailResult = await emailService.sendBekoCustomerRefusalNotification(
    testClient,
    serviceId,
    applianceName,
    refusalReason,
    technicianName,
    manufacturerName
  );
  console.log(`   Rezultat: ${bekoEmailResult ? '✅ USPEŠNO' : '❌ NEUSPEŠNO'}`);
  
  console.log('');
  console.log('📊 REZULTAT TESTIRANJA:');
  console.log(`   Customer email: ${customerEmailResult ? '✅' : '❌'}`);
  console.log(`   Beko business email: ${bekoEmailResult ? '✅' : '❌'}`);
  
  if (customerEmailResult && bekoEmailResult) {
    console.log('🎉 SVI TESTOVI USPEŠNI! Beko customer refusal sistem funkcioniše ispravno.');
    console.log('');
    console.log('📧 Email-ovi poslati na:');
    console.log(`   • Klijent: ${testClient.email}`);
    console.log('   • Business: jelena@frigosistemtodosijevic.com');
    console.log('   • Business: mp4@eurotehnikamn.me');
  } else {
    console.log('⚠️ NEKI TESTOVI NEUSPEŠNI! Proverite konfiguraciju email servisa.');
  }
  
} catch (error) {
  console.error('❌ GREŠKA PRI TESTIRANJU:', error);
  console.log('');
  console.log('💡 MOGUĆE UZROCI:');
  console.log('   • Email server nije konfigurisan');
  console.log('   • SMTP settings nisu ispravni');
  console.log('   • Network konekcija problema');
}

console.log('');
console.log('🔚 Test završen.');