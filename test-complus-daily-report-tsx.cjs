// Test ComPlus dnevni izveštaj funkcionalnost preko API poziva
const http = require('http');

function makePostRequest(data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/test-complus-daily-report',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({ statusCode: res.statusCode, data: parsedData });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: responseData, isHtml: true });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

async function testDailyReport() {
  console.log('🎯 TESTIRANJE COMPLUS DNEVNOG IZVEŠTAJA VIA API');
  console.log('==============================================');
  
  try {
    console.log('📅 Slanje zahteva za dnevni izveštaj...');
    
    const requestData = {
      email: 'gruica@frigosistemtodosijevic.com',
      date: new Date().toISOString()
    };
    
    console.log(`📧 Test email: ${requestData.email}`);
    console.log(`📆 Datum: ${new Date().toLocaleDateString('sr-ME')}`);
    
    const response = await makePostRequest(requestData);
    
    console.log(`📊 Status kod: ${response.statusCode}`);
    
    if (response.isHtml) {
      console.log('⚠️  API je vratio HTML umesto JSON - možda je greška u rutama');
      console.log('🔍 Prvi deo odgovora:', response.data.substring(0, 200));
    } else {
      console.log('📋 Odgovor API-ja:');
      console.log(JSON.stringify(response.data, null, 2));
      
      if (response.data.success) {
        console.log('✅ USPEŠNO! ComPlus dnevni izveštaj je poslat!');
        console.log(`📨 ${response.data.message}`);
        console.log(`📅 ${response.data.details}`);
      } else {
        console.log('❌ GREŠKA:', response.data.error);
      }
    }
    
  } catch (error) {
    console.error('❌ GREŠKA pri API pozivu:', error.message);
  }
  
  console.log('');
  console.log('🔄 Test završen');
}

// Čekam da se server pokrene, zatim testiram
setTimeout(() => {
  testDailyReport();
}, 2000);