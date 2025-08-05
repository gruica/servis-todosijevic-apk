#!/usr/bin/env node

/**
 * Script za bulk slanje ComPlus profesionalnih izvještaja
 * Koristi se za slanje izvještaja za multiple datume odjednom
 */

import { complusCronService } from './server/complus-cron-service.js';

const targetDates = [
  '2025-07-30',
  '2025-07-31', 
  '2025-08-01',
  '2025-08-02',
  '2025-08-03',
  '2025-08-04'
];

const recipients = [
  'robert.ivezic@tehnoplus.me',
  'servis@complus.me'
];

async function sendBulkReports() {
  console.log('🚀 Pokretanje bulk slanja ComPlus profesionalnih izvještaja...');
  console.log(`📅 Datumi: ${targetDates.join(', ')}`);
  console.log(`📧 Primaoci: ${recipients.join(', ')}`);
  console.log('');

  let successCount = 0;
  let errorCount = 0;

  for (const date of targetDates) {
    console.log(`\n📊 Slanjem izvještaja za datum: ${date}`);
    
    for (const recipient of recipients) {
      try {
        console.log(`  → Slanjem na: ${recipient}`);
        await complusCronService.testProfessionalReport(recipient, date);
        successCount++;
        console.log(`  ✅ Uspješno poslano`);
        
        // Kratka pauza između slanja
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        errorCount++;
        console.log(`  ❌ Greška: ${error.message}`);
      }
    }
    
    // Duža pauza između datuma
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  console.log('\n📈 Završetak bulk slanja:');
  console.log(`✅ Uspješno poslano: ${successCount} izvještaja`);
  console.log(`❌ Greške: ${errorCount} izvještaja`);
  console.log(`📊 Ukupno: ${targetDates.length * recipients.length} izvještaja`);
}

// Pokreni script
sendBulkReports()
  .then(() => {
    console.log('\n🎉 Bulk slanje završeno!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Fatalna greška:', error);
    process.exit(1);
  });