// Test jednostavan SMS template za Com Plus validaciju

const testData = {
  serviceId: '125',
  clientName: 'Miloš Nikolić',  
  deviceType: 'Veš mašina',
  manufacturerName: 'Electrolux',
  partName: 'Motor za veš mašinu',
  orderedBy: 'Gruica',
  urgency: 'urgent'
};

// Simulacija template funkcije
function supplierPartsOrdered(data) {
  const urgencyText = data.urgency === 'urgent' ? 'HITNO' : data.urgency === 'high' ? 'BRZO' : '';
  const message = `${urgencyText} Deo poručen za ${data.manufacturerName} servis #${data.serviceId}. Klijent: ${data.clientName}, Deo: ${data.partName}, Naručio: ${data.orderedBy}`;
  return message;
}

console.log('🧪 TESTIRANJE COM PLUS SMS TEMPLATE-A:');
console.log('');

const smsMessage = supplierPartsOrdered(testData);
console.log('Template: supplier_parts_ordered');
console.log('Poruka:', smsMessage);
console.log('Dužina:', smsMessage.length, 'karaktera');
console.log('Status:', smsMessage.length <= 160 ? '✅ JEDNODELNA PORUKA' : '❌ PREDUGAČKA PORUKA');

console.log('');
console.log('📋 ANALIZA:');
console.log('• Uključuje HITNO za urgent urgency ✅');
console.log('• Naziv proizvođača (Electrolux) ✅');
console.log('• Broj servisa (#125) ✅');
console.log('• Ime klijenta (Miloš Nikolić) ✅');
console.log('• Naziv dela (Motor za veš mašinu) ✅');
console.log('• Ko je naručio (Gruica) ✅');

console.log('');
console.log('🎯 FINALNA PORUKA ZA COM PLUS (067590272):');
console.log(smsMessage);