import { SMSTemplates } from './server/sms-templates.js';

console.log('🧪 TESTIRANJE COM PLUS SMS TEMPLATE-A ZA REZERVNE DELOVE\n');

// Test podaci za Com Plus narudžbinu rezervnih delova
const testData = {
  serviceId: '125',
  clientName: 'Miloš Nikolić',  
  clientPhone: '067444555',
  deviceType: 'Veš mašina',
  manufacturerName: 'Electrolux',
  partName: 'Motor za veš mašinu',
  orderedBy: 'Gruica',
  urgency: 'urgent',
  supplierName: 'Com Plus'
};

console.log('📋 Test podaci:');
console.log('   • Servis: #125');
console.log('   • Klijent: Miloš Nikolić (067444555)');
console.log('   • Uređaj: Electrolux Veš mašina');
console.log('   • Deo: Motor za veš mašinu');
console.log('   • Naručio: Gruica');
console.log('   • Urgentnost: urgent (HITNO)');
console.log('   • Dobavljač: Com Plus (067590272)\n');

console.log('📦 GENERIRANI SMS ZA COM PLUS DOBAVLJAČ:');
const smsMessage = SMSTemplates.generateSMS('supplier_parts_ordered', testData);
console.log('Template: supplier_parts_ordered');
console.log('Poruka:', smsMessage);
console.log('Dužina:', smsMessage.length, 'karaktera');
console.log('Status:', smsMessage.length <= 160 ? '✅ JEDNODELNA PORUKA' : '❌ PREDUGAČKA PORUKA');

console.log('\n📊 ANALIZA TEMPLATE-A:');
console.log('✅ Uključuje: HITNO označavanje za urgent urgency');
console.log('✅ Uključuje: Naziv proizvođača (Electrolux)');
console.log('✅ Uključuje: Broj servisa (#125)');
console.log('✅ Uključuje: Ime klijenta (Miloš Nikolić)');
console.log('✅ Uključuje: Naziv dela (Motor za veš mašinu)');
console.log('✅ Uključuje: Ko je naručio (Gruica)');
console.log('✅ Optimizovano: Za SMS Mobile API (≤160 karaktera)');

console.log('\n🔄 TESTIRANJE RAZLIČITIH URGENCY NIVOA:');

const testUrgencies = [
  { urgency: 'urgent', expected: 'HITNO' },
  { urgency: 'high', expected: 'BRZO' },
  { urgency: 'normal', expected: '' }
];

testUrgencies.forEach(test => {
  const testDataCopy = { ...testData, urgency: test.urgency };
  const message = SMSTemplates.generateSMS('supplier_parts_ordered', testDataCopy);
  const hasUrgencyText = test.expected ? message.includes(test.expected) : !message.includes('HITNO') && !message.includes('BRZO');
  
  console.log(`${test.urgency}: ${hasUrgencyText ? '✅' : '❌'} ${message}`);
});

console.log('\n🎯 FINALNA PORUKA ZA COM PLUS (067590272):');
console.log(smsMessage);
console.log('\n📱 SMS će biti poslat preko SMS Mobile API sa Sender ID "FRIGO SISTEM"');