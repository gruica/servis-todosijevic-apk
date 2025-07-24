const https = require('https');

// Test automatskih SMS triggera za workflow akcije
async function testAutomaticSMSTriggers() {
  console.log('🔧 TESTIRANJE AUTOMATSKIH SMS TRIGGERA ZA WORKFLOW AKCIJE');
  console.log('='.repeat(60));

  // 1. Uloguj se kao tehnicijar Gruica
  const loginData = {
    username: 'gruica@frigosistemtodosijevic.com',
    password: 'serviser123'
  };

  console.log('1. PRIJAVLJUJEM TEHNICIARA GRUICA...');
  
  try {
    const loginResponse = await makeRequest('/api/jwt-login', 'POST', loginData);
    console.log('✅ Login uspešan, dobio JWT token');
    
    const jwt_token = loginResponse.token;
    
    // 2. Test trigger-a za evidenciju uklonjenih delova (device_parts_removed)
    console.log('\n2. TESTIRANJE TRIGGER-A: EVIDENTIRAJ UKLONJENE DELOVE');
    console.log('Pozivam PATCH /api/services/58/parts-removed...');
    
    const removedPartsResponse = await makeRequest('/api/services/58/parts-removed', 'PATCH', {}, jwt_token);
    console.log('✅ Endpoint odgovorio:', removedPartsResponse);
    
    // 3. Test trigger-a za porudžbinu rezervnih delova
    console.log('\n3. TESTIRANJE TRIGGER-A: PORUČI REZERVNI DEO');
    console.log('Pozivam POST /api/services/55/spare-parts...');
    
    const sparePartsOrder = {
      partName: 'Test rezervni deo',
      catalogNumber: 'TEST-12345',
      urgency: 'normal',
      description: 'Test porudžbina za automatski SMS trigger'
    };
    
    const sparePartsResponse = await makeRequest('/api/services/55/spare-parts', 'POST', sparePartsOrder, jwt_token);
    console.log('✅ Endpoint odgovorio:', sparePartsResponse);
    
    // 4. Test trigger-a za klijent nije dostupan
    console.log('\n4. TESTIRANJE TRIGGER-A: KLIJENT NIJE DOSTUPAN');
    console.log('Pozivam PUT /api/services/58/status sa client_not_home...');
    
    const clientNotHomeData = {
      status: 'client_not_home',
      notes: 'Test automatskog SMS trigger-a',
      clientUnavailableReason: 'Test razlog',
      needsRescheduling: true,
      reschedulingNotes: 'Test napomene za novo zakazivanje'
    };
    
    const clientNotHomeResponse = await makeRequest('/api/services/58/status', 'PUT', clientNotHomeData, jwt_token);
    console.log('✅ Endpoint odgovorio:', clientNotHomeResponse);
    
    console.log('\n🎯 SVI AUTOMATSKI TRIGGERI TESTIRANI!');
    console.log('Proveri server logove za SMS slanja administrator-ima.');
    
  } catch (error) {
    console.error('❌ GREŠKA TOKOM TESTIRANJA:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Helper funkcija za HTTP zahtjeve
function makeRequest(path, method, data = {}, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Node.js SMS Trigger Test'
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
          const parsedData = JSON.parse(responseData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsedData);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${parsedData.error || responseData}`));
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ rawResponse: responseData });
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
          }
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (method !== 'GET' && Object.keys(data).length > 0) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Pokreni test
testAutomaticSMSTriggers();