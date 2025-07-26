import fetch from 'node-fetch';

// Test podatci
const serviceId = 21; // Beko servis Slavica Nedović (email promenjen na gruica@icloud.com)
const testData = {
  status: "customer_refused_repair",
  customerRefusalReason: "TEST: Previsoka cena popravke - klijent neće da plati 500 EUR za rezervni deo",
  technicianNotes: "TEST customer refusal email za Beko mašinu za veš"
};

// Admin JWT token from environment
const adminToken = process.env.TEST_JWT_TOKEN || (() => {
  console.error('🚨 TEST ERROR: TEST_JWT_TOKEN environment variable is required');
  throw new Error('TEST_JWT_TOKEN environment variable must be set for testing');
})();

console.log('🧪 TESTIRANJE BEKO CUSTOMER REFUSAL EMAIL SISTEMA');
console.log('===================================================');
console.log(`🔧 Testiram servis ID: ${serviceId}`);
console.log(`📧 Email će biti poslat na: gruica@icloud.com`);
console.log(`❌ Test razlog odbijanja: ${testData.customerRefusalReason}`);
console.log('');

try {
  console.log('📡 Šaljem API poziv...');
  
  const response = await fetch(`https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/api/services/${serviceId}/status`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(testData)
  });

  const result = await response.json();
  
  console.log(`📊 API Response Status: ${response.status}`);
  console.log('📄 Response Body:', JSON.stringify(result, null, 2));
  
  if (response.ok) {
    console.log('');
    console.log('✅ TEST USPEŠAN!');
    console.log('📧 Proverite email inboxove:');
    console.log('   • gruica@icloud.com (klijent email)');
    console.log('   • jelena@frigosistemtodosijevic.com (Beko business)');
    console.log('   • mp4@eurotehnikamn.me (Beko business)');
    console.log('');
    console.log('🔍 Email informacije:');
    console.log(`   • Email sent: ${result.emailSent ? 'DA' : 'NE'}`);
    console.log(`   • Client name: ${result.clientName || 'N/A'}`);
    
    if (result.emailDetails) {
      console.log('   • Email details:', result.emailDetails);
    }
  } else {
    console.log('');
    console.log('❌ TEST NEUSPEŠAN!');
    console.log('📄 Greška:', result.error || 'Unknown error');
  }
  
} catch (error) {
  console.error('❌ NETWORK GREŠKA:', error.message);
}

console.log('');
console.log('🔄 Vraćam originalni email...');

// Vratiti originalni email
try {
  const restoreResponse = await fetch('https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/api/admin/execute-sql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: "UPDATE clients SET email = 'nedovicslavica8@gmail.com' WHERE id = (SELECT client_id FROM services WHERE id = 21);"
    })
  });
  
  if (restoreResponse.ok) {
    console.log('✅ Originalni email vraćen: nedovicslavica8@gmail.com');
  } else {
    console.log('⚠️ Potrebno je ručno vratiti email za Slavica Nedović');
  }
} catch (restoreError) {
  console.log('⚠️ Greška pri vraćanju email-a:', restoreError.message);
}

console.log('🔚 Test završen.');