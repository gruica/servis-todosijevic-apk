/**
 * Test skript za demonstraciju migracije podataka iz starog sistema
 * Na osnovu Excel tabele sa slike
 */

import * as XLSX from 'xlsx';
import fs from 'fs';

// Simulacija podataka iz Excel tabele sa slike
const testData = [
  {
    'Klijent': 'Darko Bogdan',
    'Telefon': '067/156-607',
    'Grad': 'TV',
    'Uređaj': 'frižider',
    'Proizvođač': 'Samsung',
    'Model': 'RF50K',
    'Serijski broj': '12345',
    'Napomena': 'redovan pregled'
  },
  {
    'Klijent': 'Božidar Lakovic',
    'Telefon': '069/195-955',
    'Grad': 'TV',
    'Uređaj': 'frižider',
    'Proizvođač': 'LG',
    'Model': 'GR-B459',
    'Serijski broj': '67890',
    'Napomena': 'potrebna servis'
  },
  {
    'Klijent': 'Ivan Rabasevic',
    'Telefon': '069/567-789',
    'Grad': 'KO',
    'Uređaj': 'frižider',
    'Proizvođač': 'Bosch',
    'Model': 'KGV',
    'Serijski broj': '54321',
    'Napomena': 'kvar kompresora'
  },
  {
    'Klijent': 'Nikola Kuzmanović',
    'Telefon': '067/567-789',
    'Grad': 'BD',
    'Uređaj': 'frižider',
    'Proizvođač': 'Whirlpool',
    'Model': 'WBA',
    'Serijski broj': '98765',
    'Napomena': 'ne hladi'
  },
  {
    'Klijent': 'Milica Kuzmanović',
    'Telefon': '069/123-456',
    'Grad': 'BD',
    'Uređaj': 'frižider',
    'Proizvođač': 'Candy',
    'Model': 'CFBD',
    'Serijski broj': '13579',
    'Napomena': 'promena filtera'
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
    fullName: row.Klijent,
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
    client: row.Klijent,
    category: row.Uređaj,
    manufacturer: row.Proizvođač,
    model: row.Model,
    serialNumber: row['Serijski broj'],
    notes: row.Napomena
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
    console.log(`   Kategorija: ${appliance.category}`);
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
console.log('🌍 Automatsko mapiranje gradova:');
console.log('   TV → Tivat, KO → Kotor, BD → Budva');