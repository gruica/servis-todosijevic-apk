// Test business partner SMS notifications
const https = require('https');

async function main() {
  console.log('🔧 TESTIRANJE BUSINESS PARTNER SMS OBAVEŠTENJA');
  console.log('='.repeat(50));

  try {
    // 1. Login
    const loginData = {
      username: 'gruica@frigosistemtodosijevic.com',
      password: 'serviser123'
    };

    console.log('1. PRIJAVLJIVANJE...');
    const loginResponse = await makeRequest('https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/api/jwt-login', 'POST', loginData);
    console.log('✅ Login uspešan');
    
    const jwt_token = loginResponse.token;

    // 2. Test sa servisom koji ima business_partner_id = 19 (Robert Ivezić)
    console.log('\n2. TESTIRAM SPARE PARTS ZA BUSINESS PARTNER (Servis #55)...');
    
    const sparePartsOrder = {
      partName: 'Test BP rezervni deo',
      catalogNumber: 'BP-TEST-123',
      urgency: 'urgent',
      description: 'Test za business partner SMS obaveštenja'
    };
    
    const response = await makeRequest('https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/api/services/55/spare-parts', 'POST', sparePartsOrder, jwt_token);
    console.log('✅ Spare Parts Response:', JSON.stringify(response, null, 2));
    
    console.log('\n🎯 TEST ZAVRŠEN!');
    console.log('Proveri server logove da vidiš da li je SMS poslat poslovnom partneru Robert Ivezić (068039039)');
    
  } catch (error) {
    console.error('❌ GREŠKA:', error.message);
  }
}

function makeRequest(url, method, data = {}, token = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
        } catch (e) {
          resolve(responseData);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (method !== 'GET' && data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

main();