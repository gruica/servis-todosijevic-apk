// Debug script za admin spare parts problem
console.log('🔍 DEBUGGING ADMIN SPARE PARTS PORUČIVANJE PROBLEMA\n');

// Simuliram frontend podatke koje korisnik unosi
const testFrontendData = {
  serviceId: null, // Direktno poručivanje (bez servisa)
  brand: 'beko',
  deviceModel: 'WMB 71643 PTE',
  productCode: '481281729632',
  applianceCategory: 'Mašina za veš',
  partName: 'Pumpa za vodu',
  quantity: 1,
  description: 'Test opis',
  warrantyStatus: 'u garanciji',
  urgency: 'normal',
  emailTarget: 'servis@eurotehnikamn.me'
};

console.log('📋 FRONTEND PODACI:');
Object.entries(testFrontendData).forEach(([key, value]) => {
  console.log(`   ${key}: "${value}" (${typeof value}) - ${value ? '✅ OK' : '❌ PRAZAN'}`);
});

console.log('\n🔧 MOGUĆI PROBLEMI:');
console.log('1. AUTH TOKEN - Frontend koristi pogrešan token key');
console.log('2. CORS ISSUE - Browser blokira zahtev');
console.log('3. FRONTEND VALIDACIJA - Form se ne submituje');
console.log('4. API POZIV - Podatci se ne šalju pravilno');
console.log('5. BACKEND VALIDACIJA - Server odbacuje zahtev');

console.log('\n🎯 FRONTEND DEBUGGING STEPS:');
console.log('1. Otvoriti browser Console (F12)');
console.log('2. Popuniti formu potpuno');
console.log('3. Kliknuti "Poruči"');
console.log('4. Proveriti da li se ispisuju debug poruke:');
console.log('   - "🔧 ADMIN FORM VALIDATION DEBUG:"');
console.log('   - "🔧 FRONTEND: Šaljem porudžbinu sa podacima:"');
console.log('   - "🔧 FRONTEND: Odgovor servera:"');

console.log('\n🎯 SERVER DEBUGGING:');
console.log('1. Proveriti server konzolu za:');
console.log('   - "🔧 ADMIN SPARE PARTS ORDER DEBUG:"');
console.log('   - "🔧 FULL REQUEST BODY:"');
console.log('   - "🔧 BACKEND VALIDATION CHECK:"');

console.log('\n✅ OČEKIVANI TOK:');
console.log('1. User popuni formu');
console.log('2. Frontend validacija prošle');
console.log('3. API poziv se pošalje');
console.log('4. Backend primi podatke');
console.log('5. Backend validacija prošla');
console.log('6. Email se pošalje');
console.log('7. SMS notifikacija');
console.log('8. Success odgovor');

console.log('\n❌ PROBLEM MOGAO BI BITI:');
console.log('- Frontend se ne pokreće handleSubmit');
console.log('- Auth token nije ispravan');
console.log('- CORS blokira zahtev');
console.log('- Network greška');