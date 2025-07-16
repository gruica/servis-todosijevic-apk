/**
 * Skripta za uvoz podataka iz starog sistema
 * Posebno prilagođena za format Excel tabele sa skraćenicama gradova
 * i specifičnim nazivima kolona iz starog sistema
 */

import { ExcelService } from '../server/excel-service';
import * as XLSX from 'xlsx';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Mapiranje naziva kolona iz starog sistema u standardni format
 */
const LEGACY_COLUMN_MAPPING: Record<string, string> = {
  // Imena klijenata
  'Klijent': 'fullName',
  'Ime i prezime': 'fullName',
  'Vlasnik': 'fullName',
  'Ime': 'fullName',
  'Ime i prezime klijenta': 'fullName',
  
  // Telefoni
  'Telefon': 'phone',
  'Broj telefona': 'phone',
  'Mob': 'phone',
  'Tel': 'phone',
  
  // Gradovi
  'Grad': 'city',
  'Mesto': 'city',
  'Lokacija': 'city',
  
  // Adrese
  'Adresa': 'address',
  'Ulica': 'address',
  'Lokacija': 'address',
  
  // Uređaji
  'Uređaj': 'category',
  'Tip uređaja': 'category',
  'Aparat': 'category',
  'Kategorija': 'category',
  'Tip aparata': 'category',
  
  // Modeli
  'Model': 'model',
  'Tip': 'model',
  
  // Serijski brojevi
  'Serijski broj': 'serialNumber',
  'SN': 'serialNumber',
  'Serial': 'serialNumber',
  
  // Proizvođači
  'Proizvođač': 'manufacturer',
  'Marka': 'manufacturer',
  'Brend': 'manufacturer',
  
  // Napomene
  'Napomena': 'notes',
  'Opis': 'notes',
  'Kvar': 'notes',
  'Problem': 'notes',
  'Opis kvara': 'notes',
  
  // Datumi
  'Datum': 'purchaseDate',
  'Datum kupovine': 'purchaseDate',
  'Kupovno': 'purchaseDate',
  'Datum prijave': 'createdDate',
  
  // Garancija
  'Garancija': 'warranty',
  'Garantni period': 'warranty',
};

class LegacyDataImporter {
  private excelService: ExcelService;

  constructor() {
    this.excelService = ExcelService.getInstance();
  }

  /**
   * Mapiranje skraćenica gradova iz starog sistema u pun naziv
   */
  private mapCityCode(cityCode: string): string {
    const cityMap: Record<string, string> = {
      'TV': 'Tivat',
      'KO': 'Kotor',
      'BD': 'Budva',
      'PG': 'Podgorica',
      'NK': 'Nikšić',
      'PL': 'Pljevlja',
      'HN': 'Herceg Novi',
      'BA': 'Bar',
      'UL': 'Ulcinj',
      'CT': 'Cetinje',
      'BJ': 'Bijelo Polje',
      'RO': 'Rožaje',
      'PV': 'Plav',
      'ZB': 'Žabljak',
      'DG': 'Danilovgrad',
      'MK': 'Mojkovac',
      'KL': 'Kolašin',
      'BE': 'Berane',
      'AN': 'Andrijevica',
      'PZ': 'Plužine',
      'SA': 'Šavnik',
      'GO': 'Gusinje',
      'PE': 'Petnjica'
    };
    
    const upperCode = cityCode.toUpperCase().trim();
    return cityMap[upperCode] || cityCode;
  }

  /**
   * Mapiranje skraćenica tipova aparata iz starog sistema u pun naziv kategorije
   */
  private mapApplianceTypeCode(typeCode: string): string {
    const typeMap: Record<string, string> = {
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
      'SPORET': 'Šporet',
      'rerka': 'Rerka',
      'RERKA': 'Rerka',
      'RERNA': 'Rerka',
      'rerna': 'Rerka',
      'TA': 'Toster aparat',
      'toster': 'Toster aparat',
      'TOSTER': 'Toster aparat',
      'klimu': 'Klima uređaj',
      'KLIMU': 'Klima uređaj',
      'klima': 'Klima uređaj',
      'KLIMA': 'Klima uređaj',
      'inverter': 'Inverter klima',
      'INVERTER': 'Inverter klima'
    };
    
    const trimmedCode = typeCode.trim();
    return typeMap[trimmedCode] || typeMap[trimmedCode.toUpperCase()] || trimmedCode;
  }

  /**
   * Konvertuje Excel fajl iz starog sistema u standardni format
   */
  public convertLegacyExcel(inputPath: string, outputPath: string): void {
    console.log(`Čitanje fajla: ${inputPath}`);
    const workbook = XLSX.readFile(inputPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Pronađeno ${data.length} redova podataka`);

    // Konvertuj podatke
    const convertedData = data.map((row: any) => {
      const converted: Record<string, any> = {};
      
      // Mapiraj kolone
      Object.entries(row).forEach(([key, value]) => {
        const normalizedKey = key.trim();
        const mappedKey = LEGACY_COLUMN_MAPPING[normalizedKey] || normalizedKey.toLowerCase();
        converted[mappedKey] = value;
      });

      return converted;
    });

    // Kreiraj novi workbook
    const newWorkbook = XLSX.utils.book_new();
    const newWorksheet = XLSX.utils.json_to_sheet(convertedData);
    XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Konvertovani podaci');

    // Sačuvaj konvertovani fajl
    XLSX.writeFile(newWorkbook, outputPath);
    console.log(`Konvertovani fajl sačuvan: ${outputPath}`);
  }

  /**
   * Analizira strukturu Excel fajla i prikazuje nazive kolona
   */
  public analyzeExcelStructure(filePath: string): void {
    console.log(`\n=== ANALIZA STRUKTURE FAJLA: ${filePath} ===`);
    
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      console.log('Fajl je prazan ili nema podataka');
      return;
    }

    console.log(`Broj redova: ${data.length}`);
    console.log(`Broj sheet-ova: ${workbook.SheetNames.length}`);
    console.log(`Naziv sheet-a: ${sheetName}`);

    // Prikaži nazive kolona
    const firstRow = data[0] as Record<string, any>;
    console.log('\n=== NAZIVI KOLONA ===');
    Object.keys(firstRow).forEach((key, index) => {
      const mappedKey = LEGACY_COLUMN_MAPPING[key.trim()] || 'NIJE MAPIRAN';
      console.log(`${index + 1}. "${key}" -> ${mappedKey}`);
    });

    // Prikaži primer podataka
    console.log('\n=== PRIMER PODATAKA (prvi red) ===');
    Object.entries(firstRow).forEach(([key, value]) => {
      console.log(`${key}: ${value}`);
    });

    // Proveri gradove
    console.log('\n=== ANALIZA GRADOVA ===');
    const cities = new Set<string>();
    data.forEach((row: any) => {
      const city = row['Grad'] || row['grad'] || row['Mesto'] || row['mesto'] || '';
      if (city) cities.add(String(city).trim());
    });
    
    console.log('Pronađeni gradovi:');
    Array.from(cities).sort().forEach(city => {
      console.log(`- ${city}`);
    });
  }

  /**
   * Priprema podatke za uvoz klijenata
   */
  public prepareClientData(inputPath: string, outputPath: string): void {
    console.log('\n=== PRIPREMA PODATAKA ZA KLIJENTE ===');
    
    const workbook = XLSX.readFile(inputPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const clientData = data.map((row: any) => {
      const rawCity = row['Grad'] || row['Mesto'] || row['Lokacija'] || '';
      const mappedCity = rawCity ? this.mapCityCode(String(rawCity)) : '';
      
      return {
        fullName: row['Klijent'] || row['Ime i prezime'] || row['Ime i prezime klijenta'] || row['Vlasnik'] || '',
        phone: row['Telefon'] || row['Broj telefona'] || row['Mob'] || row['Tel'] || '',
        city: mappedCity,
        address: row['Adresa'] || row['Ulica'] || '',
        email: row['Email'] || row['E-mail'] || ''
      };
    });

    // Ukloni duplikate na osnovu telefona
    const uniqueClients = clientData.filter((client, index, self) => 
      client.phone && self.findIndex(c => c.phone === client.phone) === index
    );

    console.log(`Ukupno redova: ${data.length}`);
    console.log(`Jedinstvenih klijenata: ${uniqueClients.length}`);

    // Prikaži mapiranje gradova
    const cityMappings = new Set<string>();
    uniqueClients.forEach(client => {
      if (client.city) cityMappings.add(client.city);
    });
    
    console.log('\nMapiranje gradova:');
    Array.from(cityMappings).sort().forEach(city => {
      console.log(`- ${city}`);
    });

    // Kreiraj novi Excel fajl
    const newWorkbook = XLSX.utils.book_new();
    const newWorksheet = XLSX.utils.json_to_sheet(uniqueClients);
    XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Klijenti');

    XLSX.writeFile(newWorkbook, outputPath);
    console.log(`Fajl za klijente kreiran: ${outputPath}`);
  }

  /**
   * Priprema podatke za uvoz uređaja
   */
  public prepareApplianceData(inputPath: string, outputPath: string): void {
    console.log('\n=== PRIPREMA PODATAKA ZA UREĐAJE ===');
    
    const workbook = XLSX.readFile(inputPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const applianceData = data.map((row: any) => {
      const rawCategory = row['Uređaj'] || row['Tip uređaja'] || row['Tip aparata'] || row['Aparat'] || '';
      const mappedCategory = rawCategory ? this.mapApplianceTypeCode(String(rawCategory)) : 'Nepoznat';
      
      return {
        client: row['Klijent'] || row['Ime i prezime'] || row['Ime i prezime klijenta'] || row['Vlasnik'] || '',
        category: mappedCategory,
        manufacturer: row['Proizvođač'] || row['Marka'] || row['Brend'] || 'Nepoznat',
        model: row['Model'] || row['Tip'] || '',
        serialNumber: row['Serijski broj'] || row['SN'] || row['Serial'] || '',
        notes: row['Napomena'] || row['Opis'] || row['Opis kvara'] || row['Kvar'] || row['Problem'] || ''
      };
    });

    // Filtriranje redova sa validnim podacima
    const validAppliances = applianceData.filter(appliance => 
      appliance.client && (appliance.model || appliance.serialNumber || appliance.category !== 'Nepoznat')
    );

    console.log(`Ukupno redova: ${data.length}`);
    console.log(`Validnih uređaja: ${validAppliances.length}`);

    // Prikaži mapiranje tipova aparata
    const categoryMappings = new Set<string>();
    validAppliances.forEach(appliance => {
      if (appliance.category) categoryMappings.add(appliance.category);
    });
    
    console.log('\nMapiranje tipova aparata:');
    Array.from(categoryMappings).sort().forEach(category => {
      console.log(`- ${category}`);
    });

    // Kreiraj novi Excel fajl
    const newWorkbook = XLSX.utils.book_new();
    const newWorksheet = XLSX.utils.json_to_sheet(validAppliances);
    XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Uređaji');

    XLSX.writeFile(newWorkbook, outputPath);
    console.log(`Fajl za uređaje kreiran: ${outputPath}`);
  }
}

// Glavna funkcija
async function main() {
  const importer = new LegacyDataImporter();
  
  if (process.argv.length < 4) {
    console.log(`
Upotreba: npm run legacy-import <komanda> <putanja_do_fajla>

Komande:
  analyze <file.xlsx>              - Analizira strukturu Excel fajla
  convert <input.xlsx> <output.xlsx> - Konvertuje u standardni format
  clients <input.xlsx> <output.xlsx> - Priprema podatke za uvoz klijenata
  appliances <input.xlsx> <output.xlsx> - Priprema podatke za uvoz uređaja

Primeri:
  npm run legacy-import analyze stari_sistem.xlsx
  npm run legacy-import clients stari_sistem.xlsx klijenti.xlsx
  npm run legacy-import appliances stari_sistem.xlsx uredjaji.xlsx
    `);
    return;
  }

  const command = process.argv[2];
  const inputFile = process.argv[3];
  const outputFile = process.argv[4];

  try {
    switch (command) {
      case 'analyze':
        importer.analyzeExcelStructure(inputFile);
        break;
      
      case 'convert':
        if (!outputFile) {
          console.error('Nedostaje izlazni fajl za convert komandu');
          return;
        }
        importer.convertLegacyExcel(inputFile, outputFile);
        break;
      
      case 'clients':
        if (!outputFile) {
          console.error('Nedostaje izlazni fajl za clients komandu');
          return;
        }
        importer.prepareClientData(inputFile, outputFile);
        break;
      
      case 'appliances':
        if (!outputFile) {
          console.error('Nedostaje izlazni fajl za appliances komandu');
          return;
        }
        importer.prepareApplianceData(inputFile, outputFile);
        break;
      
      default:
        console.error(`Nepoznata komanda: ${command}`);
        break;
    }
  } catch (error) {
    console.error('Greška pri izvršavanju:', error);
  }
}

// Pokretanje skripte
if (require.main === module) {
  main();
}