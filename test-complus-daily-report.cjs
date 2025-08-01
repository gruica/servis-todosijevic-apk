// Test ComPlus dnevni izveštaj funkcionalnost direktno
const { exec } = require('child_process');

async function testDailyReport() {
  console.log('🎯 TESTIRANJE COMPLUS DNEVNOG IZVEŠTAJA');
  console.log('=======================================');
  
  console.log('📅 Kreiram test dnevni izveštaj sa test podacima...');
  
  try {
    // Pozivam direktno ComPlus daily report service
    const { db } = await import('./server/db.ts');
    const { ComplusDailyReportService } = await import('./server/complus-daily-report.ts');
    
    console.log('📊 Inicijalizujem ComPlus report service...');
    const reportService = new ComplusDailyReportService();
    
    // Test za danas
    const today = new Date();
    console.log(`📆 Generiram izveštaj za datum: ${today.toLocaleDateString('sr-ME')}`);
    
    const testEmail = 'gruica@frigosistemtodosijevic.com';
    console.log(`📧 Test email adresa: ${testEmail}`);
    
    const success = await reportService.sendDailyReport(today, testEmail);
    
    if (success) {
      console.log('✅ USPEŠNO! ComPlus dnevni izveštaj je poslat!');
      console.log(`📨 Email poslat na: ${testEmail}`);
      console.log('💡 Ovaj izveštaj sadrži sve ComPlus/Beko aktivnosti za danas');
    } else {
      console.log('❌ GREŠKA: ComPlus dnevni izveštaj nije poslat');
    }
    
  } catch (error) {
    console.error('❌ GREŠKA pri testiranju dnevnog izveštaja:', error.message);
    console.log('⚠️  Možda nema podataka za današnji datum ili je greška u konfiguraciji');
  }
  
  console.log('');
  console.log('🔄 Test završen');
}

testDailyReport();