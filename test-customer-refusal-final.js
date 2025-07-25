import fetch from 'node-fetch';

// Test customer refusal za servis ID 164 (Beko aparat, klijent: gruica@icloud.com)
const serviceId = 164;
const refusalData = {
  status: "customer_refused_repair", 
  customerRefusalReason: "TEST: Previsoka cena popravke - klijent odbija da plati 500 EUR za rezervni deo"
};

console.log('🧪 FINALNI TEST CUSTOMER REFUSAL EMAIL SISTEMA');
console.log('================================================');
console.log(`🔧 Servis ID: ${serviceId} (Beko aparat)`);
console.log(`📧 Klijent email: gruica@icloud.com`);
console.log(`❌ Razlog odbijanja: ${refusalData.customerRefusalReason}`);
console.log('');

// Koristiću admin login za test jer admin može da menja sve servise
async function loginAsAdmin() {
  try {
    const response = await fetch('https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/api/jwt-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'jelena@frigosistemtodosijevic.me',
        password: 'admin123'
      })
    });
    
    const result = await response.json();
    
    if (response.ok && result.token) {
      console.log('✅ Admin ulogovan uspešno');
      return result.token;
    } else {
      console.log('❌ Login neuspešan:', result.error);
      return null;
    }
  } catch (error) {
    console.log('❌ Login greška:', error.message);
    return null;
  }
}

async function testCustomerRefusal(token) {
  try {
    console.log('📡 Šaljem customer refusal zahtev...');
    
    const response = await fetch(`https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/api/services/${serviceId}/status`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(refusalData)
    });
    
    const result = await response.json();
    
    console.log(`📊 API Status: ${response.status}`);
    console.log('📄 Response:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('');
      console.log('✅ CUSTOMER REFUSAL TEST USPEŠAN!');
      console.log('📧 Email poruke su trebale biti poslane na:');
      console.log('   1. gruica@icloud.com (klijent - standardni customer refusal email)');
      console.log('   2. jelena@frigosistemtodosijevic.com (Beko business email)');
      console.log('   3. mp4@eurotehnikamn.me (Beko business email)');
      console.log('');
      console.log('💬 Email template počinje sa: "Žao nam je što ste odbili da popravljate vaš aparat"');
      
      if (result.emailSent) {
        console.log('✅ Email status: POSLAT');
      } else {
        console.log('⚠️ Email status: NIJE POSLAT ili greška');
      }
    } else {
      console.log('');
      console.log('❌ TEST NEUSPEŠAN!');
      console.log('📄 Greška:', result.error || 'Unknown error');
    }
    
  } catch (error) {
    console.error('❌ API poziv greška:', error.message);
  }
}

// Pokretanje testa
async function runTest() {
  const token = await loginAsAdmin();
  
  if (token) {
    await testCustomerRefusal(token);
  } else {
    console.log('❌ Nije moguće pokrenuti test bez validnog tokena');
  }
  
  console.log('');
  console.log('🔚 Test završen.');
}

runTest();