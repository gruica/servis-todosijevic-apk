import fetch from 'node-fetch';

async function getNewJWT() {
  const baseUrl = 'https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev';
  
  try {
    console.log('🔑 Dobijam novi JWT token...');
    const loginResponse = await fetch(`${baseUrl}/api/jwt-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'gruica@frigosistemtodosijevic.com',
        password: 'serviser123'
      })
    });

    const loginResult = await loginResponse.json();
    console.log('✅ Novi JWT token:', loginResult.token.substring(0, 20) + '...');
    return loginResult.token;
    
  } catch (error) {
    console.error('❌ Greška pri dobijanju JWT tokena:', error);
    return null;
  }
}

async function testSparePartsWithNewToken() {
  const jwt = await getNewJWT();
  if (!jwt) return;
  
  const baseUrl = 'https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev';

  console.log('\n🧪 TEST 1: Beko uređaj (servis #26) → servis@eurotehnikamn.me');
  
  try {
    const bekoResponse = await fetch(`${baseUrl}/api/spare-parts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`
      },
      body: JSON.stringify({
        serviceId: 26,
        applianceId: 34,
        partName: 'TEST Beko pumpa za vodu',
        partNumber: 'BEKO-PUMP-123',
        quantity: 1,
        urgency: 'high',
        warrantyStatus: 'in_warranty',
        description: 'Test email routing za Beko uređaj - mora ići SAMO na Eurotehnika!'
      })
    });

    const bekoText = await bekoResponse.text();
    console.log(`Status: ${bekoResponse.status}`);
    console.log('Odgovor:', bekoText);
    
  } catch (error) {
    console.error('❌ Greška pri testiranju Beko:', error);
  }

  console.log('\n🧪 TEST 2: Candy uređaj (servis #54) → servis@complus.me');
  
  try {
    const candyResponse = await fetch(`${baseUrl}/api/spare-parts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`
      },
      body: JSON.stringify({
        serviceId: 54,
        applianceId: 38,
        partName: 'TEST Candy filter za mašinu',
        partNumber: 'CANDY-FILTER-456',
        quantity: 1,
        urgency: 'high',
        warrantyStatus: 'in_warranty',
        description: 'Test email routing za Candy uređaj - mora ići SAMO na Complus!'
      })
    });

    const candyText = await candyResponse.text();
    console.log(`Status: ${candyResponse.status}`);
    console.log('Odgovor:', candyText);
    
  } catch (error) {
    console.error('❌ Greška pri testiranju Candy:', error);
  }
}

testSparePartsWithNewToken();