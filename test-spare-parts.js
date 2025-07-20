import fetch from 'node-fetch';

async function testSpareParts() {
  const baseUrl = 'https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev';
  const jwt = process.env.TEST_JWT_TOKEN;
  
  if (!jwt) {
    console.error('❌ TEST_JWT_TOKEN environment variable is not set');
    console.log('Please set TEST_JWT_TOKEN as a secret in Replit with a valid JWT token for testing');
    return;
  }

  console.log('🧪 Testiram Beko uređaj (servis #26) - treba da ide na servis@eurotehnikamn.me');
  
  try {
    const bekoResponse = await fetch(`${baseUrl}/api/spare-parts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`
      },
      body: JSON.stringify({
        serviceId: 26,
        partName: 'TEST Beko pumpa za vodu',
        partNumber: 'BEKO-PUMP-123',
        urgency: 'high',
        warrantyStatus: 'in_warranty',
        description: 'Test email routing za Beko uređaj - treba ići na Eurotehnika'
      })
    });

    const bekoResult = await bekoResponse.json();
    console.log('✅ Beko test rezultat:', bekoResult);
    
  } catch (error) {
    console.error('❌ Greška pri testiranju Beko:', error);
  }

  console.log('\n🧪 Testiram Candy uređaj (servis #54) - treba da ide na servis@complus.me');
  
  try {
    const candyResponse = await fetch(`${baseUrl}/api/spare-parts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`
      },
      body: JSON.stringify({
        serviceId: 54,
        partName: 'TEST Candy filter za mašinu',
        partNumber: 'CANDY-FILTER-456',
        urgency: 'medium',
        warrantyStatus: 'in_warranty',
        description: 'Test email routing za Candy uređaj - treba ići na Complus'
      })
    });

    const candyResult = await candyResponse.json();
    console.log('✅ Candy test rezultat:', candyResult);
    
  } catch (error) {
    console.error('❌ Greška pri testiranju Candy:', error);
  }
}

testSpareParts();