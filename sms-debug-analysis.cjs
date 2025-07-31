// Simulacija SMS template funkcionalnosti
const testData = {
  serviceId: '182',
  clientName: 'Ljubo Sekulic',
  deviceType: 'valjak za peglanje',
  manufacturerName: 'Rollman',
  technicianName: 'Gruica Todosijević',
  partnerName: 'Robert Ivezić',
  cost: '0'
};

console.log('🔍 DETALJANA ANALIZA SMS PORUKA ZA SERVIS #182\n');
console.log('📋 PODACI O SERVISU:');
console.log(`   Service ID: ${testData.serviceId}`);
console.log(`   Klijent: ${testData.clientName} (${testData.clientName.length} karaktera)`);
console.log(`   Uređaj: ${testData.deviceType} ${testData.manufacturerName}`);
console.log(`   Tehničar: ${testData.technicianName} (${testData.technicianName.length} karaktera)`);
console.log(`   Partner: ${testData.partnerName} (${testData.partnerName.length} karaktera)\n`);

// 1. Simulacija client_service_completed template
console.log('1. KLIJENT SMS (client_service_completed):');
const clientTemplates = [
  `Vaš ${testData.deviceType} je uspešno popravljen! Servis #${testData.serviceId} završen. Tehničar: ${testData.technicianName}. Hvala na poverenju!`,
  `Servis #${testData.serviceId} završen - ${testData.clientName}. ${testData.deviceType} ${testData.manufacturerName} popravljen. Tehničar: ${testData.technicianName}`,
  `${testData.clientName}, servis #${testData.serviceId} završen uspešno. ${testData.deviceType} je spreman za korišćenje. Tehničar: ${testData.technicianName}`,
  `Obaveštenje o servisu #${testData.serviceId}. Tel: 067051141` // fallback
];

clientTemplates.forEach((template, i) => {
  console.log(`   Template ${i+1}: "${template}"`);
  console.log(`   Dužina: ${template.length} karaktera`);
  console.log(`   Status: ${template.length <= 160 ? '✅ OK' : '❌ PREDUGAČKA'}`);
  if (template.length > 160) {
    console.log(`   PREKORAČENJE: ${template.length - 160} karaktera`);
  }
  console.log('');
});

// 4. Test skraćivanja imena
console.log('4. TEST SKRAĆIVANJA IMENA:');
console.log(`   Originalno ime: "Ljubo Sekulic" (${testData.clientName.length} karaktera)`);

const shortenName = (name) => {
  const parts = name.split(' ');
  if (parts.length >= 2 && name.length > 12) {
    return `${parts[0][0]}. ${parts[parts.length - 1]}`;
  }
  return name;
};

const shortName = shortenName(testData.clientName);
console.log(`   Skraćeno ime: "${shortName}" (${shortName.length} karaktera)`);
console.log(`   Ušteda: ${testData.clientName.length - shortName.length} karaktera\n`);

// 5. Optimizovane poruke
console.log('5. OPTIMIZOVANE PORUKE:');
const optimizedClient = `Servis #${testData.serviceId} završen. ${shortName}, ${testData.deviceType}. Tehničar: ${testData.technicianName}. Hvala!`;
console.log(`   Klijent optimizovano: "${optimizedClient}"`);
console.log(`   Dužina: ${optimizedClient.length} karaktera`);
console.log(`   Status: ${optimizedClient.length <= 160 ? '✅ OK' : '❌ PREDUGAČKA'}\n`);

const optimizedPartner = `Servis #${testData.serviceId} - ${shortName} (${testData.deviceType}) završen. Tehničar: ${testData.technicianName}. Hvala!`;
console.log(`   Partner optimizovano: "${optimizedPartner}"`);
console.log(`   Dužina: ${optimizedPartner.length} karaktera`);
console.log(`   Status: ${optimizedPartner.length <= 160 ? '✅ OK' : '❌ PREDUGAČKA'}`);