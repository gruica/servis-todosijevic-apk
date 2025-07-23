// Test skripta za validaciju SMS automatskih triggera za klijent_nije_dostupan funkcionalnost
import axios from 'axios';
import fs from 'fs';

const BASE_URL = 'http://localhost:5000';

// Admin JWT token za testiranje
let adminToken = '';

// Broj telefona za testiranje
const TEST_PHONE = {
  client: '067077092',    // Admin broj za testiranje
  admin: '067077092'      // Admin broj
};

async function loadAdminToken() {
  try {
    const tokenData = fs.readFileSync('admin_token.txt', 'utf8').trim();
    adminToken = tokenData;
    console.log('✅ Admin token učitan uspešno');
    return true;
  } catch (error) {
    console.error('❌ Greška pri učitavanju admin token-a:', error.message);
    return false;
  }
}

async function testClientUnavailableSMS() {
  if (!await loadAdminToken()) {
    console.log('💡 Kreiranje novog admin token-a...');
    return false;
  }

  console.log('\n🧪 TESTIRANJE SMS TRIGGERA ZA KLIJENT_NIJE_DOSTUPAN FUNKCIONALNOST');
  console.log('=' .repeat(80));

  try {
    // 1. Pronađi postojeći servis za testiranje
    console.log('\n1️⃣ Dohvatanje postojećeg servisa za testiranje...');
    
    const servicesResponse = await axios.get(`${BASE_URL}/api/admin/services`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (!servicesResponse.data || servicesResponse.data.length === 0) {
      console.log('❌ Nema dostupnih servisa za testiranje');
      return false;
    }

    // Uzmi prvi servis koji ima klijenta i servisera
    const testService = servicesResponse.data.find(s => s.clientId && s.technicianId);
    
    if (!testService) {
      console.log('❌ Nema servisa sa dodeljenim serviseram za testiranje');
      return false;
    }

    console.log(`✅ Pronađen servis za testiranje: #${testService.id}`);
    console.log(`   - Klijent ID: ${testService.clientId}`);
    console.log(`   - Serviser ID: ${testService.technicianId}`);
    console.log(`   - Trenutni status: ${testService.status}`);

    // 2. Test 1: Postavi status na "client_not_home"
    console.log('\n2️⃣ TEST 1: Postavljanje statusa "client_not_home"...');
    
    const notHomeResponse = await axios.put(`${BASE_URL}/api/services/${testService.id}/status`, {
      status: 'client_not_home',
      clientUnavailableReason: 'Klijent nije bio kući kada je serviser došao',
      needsRescheduling: true,
      reschedulingNotes: 'Potrebno kontaktirati klijenta za novi termin'
    }, {
      headers: { 
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`✅ Status ažuriran na "client_not_home"`);
    console.log(`   Response status: ${notHomeResponse.status}`);
    
    // Čekaj 2 sekunde da se SMS pošalje 
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. Test 2: Postavi status na "client_not_answering"
    console.log('\n3️⃣ TEST 2: Postavljanje statusa "client_not_answering"...');
    
    const notAnsweringResponse = await axios.put(`${BASE_URL}/api/services/${testService.id}/status`, {
      status: 'client_not_answering',
      clientUnavailableReason: 'Klijent se ne javlja na pozive',
      needsRescheduling: true,
      reschedulingNotes: 'Pokušati ponovo kontaktirati sutra ujutru'
    }, {
      headers: { 
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`✅ Status ažuriran na "client_not_answering"`);
    console.log(`   Response status: ${notAnsweringResponse.status}`);
    
    // Čekaj 2 sekunde da se SMS pošalje 
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n🎉 TESTIRANJE ZAVRŠENO!');
    console.log('=' .repeat(50));
    console.log('📱 Proverite da li su SMS poruke stigle na broj:', TEST_PHONE.client);
    console.log('👩‍💼 Proverite da li su admin SMS-ovi stigli na broj:', TEST_PHONE.admin);
    console.log('\n📋 Očekivani SMS-ovi:');
    console.log('   1. SMS klijentu o nedostupnosti (client_not_home)');
    console.log('   2. SMS administratoru o nedostupnosti klijenta (client_not_home)');
    console.log('   3. SMS klijentu o nedostupnosti (client_not_answering)');
    console.log('   4. SMS administratoru o nedostupnosti klijenta (client_not_answering)');

    return true;

  } catch (error) {
    console.error('❌ Greška tokom testiranja:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

// Pokretanje testa
testClientUnavailableSMS()
  .then(success => {
    if (success) {
      console.log('\n✅ Test uspešno završen');
      process.exit(0);
    } else {
      console.log('\n❌ Test neuspešan');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Neočekivana greška:', error);
    process.exit(1);
  });