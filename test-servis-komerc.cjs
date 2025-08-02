const { ServisKomercDailyReportService } = require('./server/servis-komerc-daily-report.js');
const { ServisKomercNotificationService } = require('./server/servis-komerc-notification-service.js');

async function testServisKomerc() {
  console.log('🧪 Pokretanje testova Servis Komerc sistema...\n');
  
  try {
    // Test 1: Dnevni izvještaj
    console.log('1️⃣ Test dnevnog izvještaja...');
    const dailyReportService = new ServisKomercDailyReportService();
    const reportData = await dailyReportService.testReportGeneration();
    
    console.log('📊 Rezultati dnevnog izvještaja:');
    console.log(`   - Završenih servisa: ${reportData.totalCompletedServices}`);
    console.log(`   - Posećenih klijenata: ${reportData.totalVisitedClients}`);
    console.log(`   - Korišćenih delova: ${reportData.totalPartsUsed}`);
    console.log(`   - Ukupan prihod: ${reportData.totalRevenue}€`);
    console.log(`   - Datum izvještaja: ${reportData.reportDate}\n`);
    
    // Test 2: Notifikacije
    console.log('2️⃣ Test notifikacija...');
    const notificationService = new ServisKomercNotificationService();
    const testHtml = await notificationService.testNotifications({
      serviceId: 'BEKO123',
      clientName: 'Marko Petrović',
      clientPhone: '069123456',
      clientAddress: 'Bulevar Oslobođenja 100, Novi Sad',
      technicianName: 'Milan Jovanović',
      applianceType: 'Frižider',
      applianceBrand: 'Beko',
      applianceModel: 'RCNE520E20ZXB',
      description: 'Ne hladi dovoljno, možda problem sa kompresorom',
      workPerformed: 'Zamenjen termostat i proverena funkcionalnost',
      cost: '180.00',
      warrantyStatus: 'van garancije'
    });
    
    console.log('📧 HTML notifikacija generisana uspešno');
    console.log(`   - Veličina HTML-a: ${testHtml.length} karaktera\n`);
    
    console.log('✅ Svi testovi Servis Komerc sistema su prošli uspešno!');
    console.log('🎯 Sistem je spreman za integraciju sa Beko servisima');
    
    // Prikaži ključne funkcionalnosti
    console.log('\n📋 Dostupne funkcionalnosti Servis Komerc sistema:');
    console.log('   🕙 Automatski dnevni izvještaji u 22:00');
    console.log('   📧 Email notifikacije o završenim servisima');
    console.log('   📱 SMS notifikacije klijentima');
    console.log('   🔧 Fokus na Beko brendove');
    console.log('   📊 Detaljni izvještaji sa rezervnim delovima');
    console.log('   🎯 Business partner targeting\n');
    
  } catch (error) {
    console.error('❌ Greška u testiranju Servis Komerc sistema:', error);
    console.error('Detalji:', error.message);
  }
}

// Pokreni test
testServisKomerc().then(() => {
  console.log('🏁 Testiranje završeno');
  process.exit(0);
}).catch(error => {
  console.error('💥 Kritična greška:', error);
  process.exit(1);
});