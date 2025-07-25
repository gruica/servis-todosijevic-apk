import fetch from 'node-fetch';

// Test direktnog poziva Beko email funkcionalnosti
console.log('🧪 DIREKTNI TEST BEKO EMAIL FUNKCIONALNOSTI');
console.log('===========================================');

// Test podatci
const testData = {
  client: {
    fullName: "Test Klijent Beko",
    email: "gruica@icloud.com",
    phone: "067123456",
    address: "Test adresa 123",
    city: "Kotor"
  },
  serviceId: 164,
  applianceName: "Mašina za veš",
  refusalReason: "TEST: Previsoka cena popravke - klijent odbija da plati 500 EUR za rezervni deo",
  technicianName: "Jovan Todosijević",
  manufacturerName: "Beko"
};

console.log('📧 Test podaci:');
console.log(`   Klijent: ${testData.client.fullName} (${testData.client.email})`);
console.log(`   Servis: #${testData.serviceId} - ${testData.applianceName}`);
console.log(`   Brend: ${testData.manufacturerName}`);
console.log(`   Razlog: ${testData.refusalReason}`);
console.log('');

// Direktno testiranje email API endpoint-a
async function testBekoEmailDirect() {
  try {
    // Admin login
    const loginResponse = await fetch('https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/api/jwt-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'jelena@frigosistemtodosijevic.me',
        password: 'admin123'
      })
    });
    
    const loginResult = await loginResponse.json();
    if (!loginResponse.ok) {
      console.log('❌ Login failed:', loginResult.error);
      return;
    }
    
    console.log('✅ Admin login uspešan');
    const token = loginResult.token;
    
    // Proverava da li postoji test endpoint za direktno testiranje Beko email-a
    console.log('📡 Testiram direktno Beko email slanje...');
    
    const testEmailResponse = await fetch('https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/api/test-beko-email', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    if (testEmailResponse.status === 404) {
      console.log('⚠️ Test endpoint ne postoji, testiram preko status update...');
      await testViaStatusUpdate(token);
      return;
    }
    
    const testResult = await testEmailResponse.json();
    console.log(`📊 Test Email API Response: ${testEmailResponse.status}`);
    console.log('📄 Response:', JSON.stringify(testResult, null, 2));
    
  } catch (error) {
    console.error('❌ Greška pri direktnom testiranju:', error.message);
  }
}

async function testViaStatusUpdate(token) {
  try {
    console.log('📡 Testiram preko status update sa customer_refused_repair...');
    
    // Reset servis na in_progress status prvo
    const resetResponse = await fetch('https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/api/services/164/status', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: "in_progress"
      })
    });
    
    console.log(`📊 Reset Status: ${resetResponse.status}`);
    
    // Sada postaviti customer_refused_repair sa razlogom
    const refusalResponse = await fetch('https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/api/services/164/status', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: "customer_refused_repair",
        customerRefusalReason: testData.refusalReason
      })
    });
    
    const refusalResult = await refusalResponse.json();
    console.log(`📊 Customer Refusal Status: ${refusalResponse.status}`);
    console.log('📄 Response:', JSON.stringify(refusalResult, null, 2));
    
    if (refusalResponse.ok) {
      console.log('');
      console.log('✅ Status update uspešan!');
      console.log('📧 Proverite da li su email-ovi poslati:');
      console.log('   1. gruica@icloud.com (klijent)');
      console.log('   2. jelena@frigosistemtodosijevic.com (Beko business)');
      console.log('   3. mp4@eurotehnikamn.me (Beko business)');
      
      if (refusalResult.emailSent) {
        console.log('📧 Email status: POSLAT');
      } else {
        console.log('⚠️ Email status: NIJE POSLAT');
      }
    }
    
  } catch (error) {
    console.error('❌ Greška pri status update testu:', error.message);
  }
}

// Pokretanje testa
testBekoEmailDirect();

console.log('');
console.log('💡 Napomena: Ovo testira da li je Beko email funkcionalnost aktivna.');
console.log('    Ako ne radi, možda postoji greška u email konfiguraciji.');
console.log('🔚 Test završen.');