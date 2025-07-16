/**
 * Test skript za demonstraciju migracije podataka iz starog sistema
 * Na osnovu Excel tabele sa slike
 */

import * as XLSX from 'xlsx';
import fs from 'fs';

// Simulacija podataka iz Excel tabele sa slike - prošireno sa tipovima aparata
const testData = [
  {
    'Ime i prezime klijenta': 'Darko Bogdan',
    'Telefon': '067/156-607',
    'Grad': 'TV',
    'Tip aparata': 'SM',
    'Proizvođač': 'Samsung',
    'Model': 'DW50K',
    'Serijski broj': '12345',
    'Opis kvara': 'ne pere kako treba'
  },
  {
    'Ime i prezime klijenta': 'Božidar Lakovic',
    'Telefon': '069/195-955',
    'Grad': 'TV',
    'Tip aparata': 'VM',
    'Proizvođač': 'LG',
    'Model': 'WM-5000',
    'Serijski broj': '67890',
    'Opis kvara': 'ne centrifugira'
  },
  {
    'Ime i prezime klijenta': 'Ivan Rabasevic',
    'Telefon': '069/567-789',
    'Grad': 'KO',
    'Tip aparata': 'VM KOMB',
    'Proizvođač': 'Bosch',
    'Model': 'WKD-300',
    'Serijski broj': '54321',
    'Opis kvara': 'ne suši'
  },
  {
    'Ime i prezime klijenta': 'Nikola Kuzmanović',
    'Telefon': '067/567-789',
    'Grad': 'BD',
    'Tip aparata': 'SM UG',
    'Proizvođač': 'Whirlpool',
    'Model': 'WDI-60',
    'Serijski broj': '98765',
    'Opis kvara': 'ne radi'
  },
  {
    'Ime i prezime klijenta': 'Milica Kuzmanović',
    'Telefon': '069/123-456',
    'Grad': 'BD',
    'Tip aparata': 'frižider',
    'Proizvođač': 'Candy',
    'Model': 'CFBD',
    'Serijski broj': '13579',
    'Opis kvara': 'ne hladi'
  },
  {
    'Ime i prezime klijenta': 'Marko Petrović',
    'Telefon': '069/987-654',
    'Grad': 'KO',
    'Tip aparata': 'šporet',
    'Proizvođač': 'Gorenje',
    'Model': 'G-500',
    'Serijski broj': '11111',
    'Opis kvara': 'ne radi ploca'
  }
];

// Funkcija za mapiranje gradova
function mapCityCode(cityCode) {
  const cityMap = {
    'TV': 'Tivat',
    'KO': 'Kotor',
    'BD': 'Budva',
    'PG': 'Podgorica',
    'NK': 'Nikšić',
    'PL': 'Pljevlja',
    'HN': 'Herceg Novi',
    'BA': 'Bar',
    'UL': 'Ulcinj',
    'CT': 'Cetinje'
  };
  return cityMap[cityCode] || cityCode;
}

// Funkcija za mapiranje tipova aparata
function mapApplianceTypeCode(typeCode) {
  const typeMap = {
    'SM': 'Sudo mašina',
    'VM': 'Veš mašina',
    'VM KOMB': 'Kombinovana veš mašina',
    'VM KOMB.': 'Kombinovana veš mašina',
    'VM komb': 'Kombinovana veš mašina',
    'VM komb.': 'Kombinovana veš mašina',
    'SM UG': 'Ugradna sudo mašina',
    'SM UG.': 'Ugradna sudo mašina',
    'SM ug': 'Ugradna sudo mašina',
    'SM ug.': 'Ugradna sudo mašina',
    'frižider': 'Frižider',
    'FRIŽIDER': 'Frižider',
    'frizider': 'Frižider',
    'FRIZIDER': 'Frižider',
    'šporet': 'Šporet',
    'ŠPORET': 'Šporet',
    'sporet': 'Šporet',
    'SPORET': 'Šporet'
  };
  
  const trimmedCode = typeCode.trim();
  return typeMap[trimmedCode] || typeMap[trimmedCode.toUpperCase()] || trimmedCode;
}

// Kreiranje Excel fajla sa test podacima
function createTestExcelFile() {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(testData);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Stari Sistem');
  
  XLSX.writeFile(workbook, 'test-stari-sistem.xlsx');
  console.log('✅ Kreiran test Excel fajl: test-stari-sistem.xlsx');
  
  // Prikaži sadržaj
  console.log('\n📄 SADRŽAJ TEST FAJLA:');
  console.log('════════════════════════════════════════════════════════════════');
  testData.forEach((row, index) => {
    console.log(`${index + 1}. ${row.Klijent} (${row.Telefon}) - ${mapCityCode(row.Grad)}`);
    console.log(`   Uređaj: ${row.Proizvođač} ${row.Model} (${row['Serijski broj']})`);
    console.log(`   Napomena: ${row.Napomena}`);
    console.log('');
  });
}

// Priprema podataka za uvoz klijenata
function prepareClientsData() {
  const clientsData = testData.map(row => ({
    fullName: row['Ime i prezime klijenta'],
    phone: row.Telefon,
    city: mapCityCode(row.Grad),
    address: '', // Nema adrese u test podacima
    email: '' // Nema email-a u test podacima
  }));
  
  // Uklanjamo duplikate na osnovu telefona
  const uniqueClients = clientsData.filter((client, index, self) => 
    self.findIndex(c => c.phone === client.phone) === index
  );
  
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(uniqueClients);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Klijenti');
  
  XLSX.writeFile(workbook, 'test-klijenti-za-uvoz.xlsx');
  console.log('✅ Kreiran fajl za uvoz klijenata: test-klijenti-za-uvoz.xlsx');
  
  console.log('\n👥 KLIJENTI ZA UVOZ:');
  console.log('════════════════════════════════════════════════════════════════');
  uniqueClients.forEach((client, index) => {
    console.log(`${index + 1}. ${client.fullName}`);
    console.log(`   Telefon: ${client.phone}`);
    console.log(`   Grad: ${client.city}`);
    console.log('');
  });
}

// Priprema podataka za uvoz uređaja
function prepareAppliancesData() {
  const appliancesData = testData.map(row => ({
    client: row['Ime i prezime klijenta'],
    category: mapApplianceTypeCode(row['Tip aparata']),
    manufacturer: row.Proizvođač,
    model: row.Model,
    serialNumber: row['Serijski broj'],
    notes: row['Opis kvara']
  }));
  
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(appliancesData);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Uređaji');
  
  XLSX.writeFile(workbook, 'test-uredjaji-za-uvoz.xlsx');
  console.log('✅ Kreiran fajl za uvoz uređaja: test-uredjaji-za-uvoz.xlsx');
  
  console.log('\n🔧 UREĐAJI ZA UVOZ:');
  console.log('════════════════════════════════════════════════════════════════');
  appliancesData.forEach((appliance, index) => {
    console.log(`${index + 1}. ${appliance.manufacturer} ${appliance.model}`);
    console.log(`   Vlasnik: ${appliance.client}`);
    console.log(`   Kategorija: ${appliance.category} (${testData[index]['Tip aparata']} → ${appliance.category})`);
    console.log(`   Serijski broj: ${appliance.serialNumber}`);
    console.log(`   Napomena: ${appliance.notes}`);
    console.log('');
  });
}

// Glavni proces
console.log('🔄 POKRETANJE TEST MIGRACIJE PODATAKA IZ STAROG SISTEMA');
console.log('════════════════════════════════════════════════════════════════');

console.log('\n1️⃣ KREIRANJE TEST EXCEL FAJLA...');
createTestExcelFile();

console.log('\n2️⃣ PRIPREMA PODATAKA ZA KLIJENTE...');
prepareClientsData();

console.log('\n3️⃣ PRIPREMA PODATAKA ZA UREĐAJE...');
prepareAppliancesData();

console.log('\n✅ TEST MIGRACIJA ZAVRŠENA!');
console.log('════════════════════════════════════════════════════════════════');
console.log('📁 Kreirani fajlovi:');
console.log('   • test-stari-sistem.xlsx (originalni format)');
console.log('   • test-klijenti-za-uvoz.xlsx (za uvoz klijenata)');
console.log('   • test-uredjaji-za-uvoz.xlsx (za uvoz uređaja)');
console.log('');
console.log('📋 Sledeći koraci:');
console.log('   1. Idite na admin panel u aplikaciji');
console.log('   2. Uvezite klijente iz test-klijenti-za-uvoz.xlsx');
console.log('   3. Uvezite uređaje iz test-uredjaji-za-uvoz.xlsx');
console.log('   4. Proverite da li su svi podaci uspešno uvezeni');
console.log('');
console.log('🌍 Automatsko mapiranje:');
console.log('   Gradovi: TV → Tivat, KO → Kotor, BD → Budva');
console.log('   Aparati: SM → Sudo mašina, VM → Veš mašina, VM KOMB → Kombinovana veš mašina');
console.log('   Aparati: SM UG → Ugradna sudo mašina, frižider → Frižider, šporet → Šporet');