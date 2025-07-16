/**
 * Test skripta za kompletnu migraciju iz starog sistema
 * Kreira test Excel fajl sa jednostavnim podacima
 */

import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// Test podaci u formatu koji odgovara starom sistemu
const testData = [
  {
    'Ime i prezime klijenta': 'Marko Petrović',
    'Telefon': '067-123-456',
    'Grad': 'TV', // Tivat
    'Tip aparata': 'VM', // Veš mašina
    'Proizvođač': 'Bosch',
    'Model': 'WAW28560EU',
    'Serijski broj': 'SN001',
    'Opis kvara': 'Ne pere, čudni zvukovi',
    'Datum registracije': '2024-01-15',
    'Garancija': 'da'
  },
  {
    'Ime i prezime klijenta': 'Ana Nikolić',
    'Telefon': '069-987-654',
    'Grad': 'BD', // Budva
    'Tip aparata': 'SM', // Sudo mašina
    'Proizvođač': 'Siemens',
    'Model': 'SN236I00ME',
    'Serijski broj': 'SN002',
    'Opis kvara': 'Ne suši sudove',
    'Datum registracije': '2024-02-20',
    'Garancija': 'ne'
  },
  {
    'Ime i prezime klijenta': 'Miloš Jovanović',
    'Telefon': '068-555-777',
    'Grad': 'PG', // Podgorica
    'Tip aparata': 'frižider',
    'Proizvođač': 'Samsung',
    'Model': 'RB33J3200SA',
    'Serijski broj': 'SN003',
    'Opis kvara': 'Ne hladi dovoljno',
    'Datum registracije': '2024-03-10',
    'Garancija': 'da'
  }
];

// Kreiraj Excel fajl
const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.json_to_sheet(testData);

// Dodaj worksheet u workbook
XLSX.utils.book_append_sheet(workbook, worksheet, 'Stari sistem');

// Sacuvaj fajl
const filename = 'test-legacy-complete.xlsx';
XLSX.writeFile(workbook, filename);

console.log(`Test fajl kreiran: ${filename}`);
console.log('Podaci u fajlu:');
testData.forEach((item, index) => {
  console.log(`${index + 1}. ${item['Ime i prezime klijenta']} - ${item['Telefon']} - ${item['Tip aparata']}`);
});

console.log('\nFajl možete koristiti za testiranje kompletne migracije.');