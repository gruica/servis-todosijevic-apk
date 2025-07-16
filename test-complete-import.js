#!/usr/bin/env node

/**
 * Test uvoza vaše Excel tabele sa simuliranim admin pristupom
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simuliramo uvoz kroz ExcelService
async function testCompleteImport() {
  try {
    // Učitaj Excel fajl
    const filePath = path.join(__dirname, 'attached_assets', 'APLIKACIJA exsel_1752656349764.xlsx');
    const buffer = fs.readFileSync(filePath);
    
    // Učitaj ExcelService
    const { ExcelService } = await import('./server/excel-service.js');
    const excelService = ExcelService.getInstance();
    
    console.log('🚀 POKRETANJE UVOZA EXCEL TABELE');
    console.log('='.repeat(50));
    
    // Pokreni uvoz
    const result = await excelService.importLegacyComplete(buffer);
    
    console.log('✅ REZULTAT UVOZA:');
    console.log(`Ukupno redova: ${result.total}`);
    console.log(`Uspešno uvezeno: ${result.imported}`);
    console.log(`Neuspešno: ${result.failed}`);
    console.log(`Kreirano klijenata: ${result.summary.clientsCreated}`);
    console.log(`Kreirano uređaja: ${result.summary.appliancesCreated}`);
    console.log(`Kreirano servisa: ${result.summary.servicesCreated}`);
    
    if (result.errors.length > 0) {
      console.log('\n⚠️  GREŠKE:');
      result.errors.slice(0, 10).forEach(error => {
        console.log(`Red ${error.row}: ${error.error}`);
      });
      
      if (result.errors.length > 10) {
        console.log(`... i još ${result.errors.length - 10} grešaka`);
      }
    }
    
  } catch (error) {
    console.error('❌ GREŠKA PRI UVOZU:', error);
  }
}

// Pokreni test
testCompleteImport().catch(console.error);