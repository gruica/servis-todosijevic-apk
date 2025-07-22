// Direktno testiranje SMS Mobile API
import https from 'https';
import querystring from 'querystring';

const testSMSDirect = () => {
  console.log('🔥 Pokušavam direktno slanje SMS-a preko SMS Mobile API...');
  
  const postData = querystring.stringify({
    'recipients': '+38267051141',
    'message': 'Test SMS poruka sa SMS Mobile API sistema - Frigo Sistem Todosijević - DIREKTAN TEST',
    'apikey': '8ddf1cbb5ed1602c6caf3ac719e627d138f2500dbcb3d9f0',
    'sendsms': '1',
    'sendwa': '0'
  });

  const options = {
    hostname: 'api.smsmobileapi.com',
    port: 443,
    path: '/sendsms/',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData),
      'User-Agent': 'FrigoSistemTodosijevic/1.0'
    }
  };

  console.log('📱 Podaci za slanje:', {
    recipients: '+38267051141',
    message: 'Test SMS poruka sa SMS Mobile API sistema - Frigo Sistem Todosijević - DIREKTAN TEST',
    sendsms: '1',
    sendwa: '0'
  });

  const req = https.request(options, (res) => {
    console.log('📊 Response status:', res.statusCode);
    console.log('📊 Response headers:', res.headers);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('📋 Response body:', data);
      try {
        const jsonResponse = JSON.parse(data);
        console.log('✅ JSON Response:', JSON.stringify(jsonResponse, null, 2));
        
        if (jsonResponse.result && jsonResponse.result.error === 0) {
          console.log('🎉 SMS USPEŠNO POSLANA!');
          console.log('📮 SMS ID:', jsonResponse.result.id);
          console.log('⏰ Datum/vreme:', jsonResponse.result.datetime);
        } else {
          console.log('❌ Greška u odgovoru:', jsonResponse.result?.error);
        }
      } catch (e) {
        console.log('📄 Odgovor nije u JSON formatu:', data);
      }
    });
  });

  req.on('error', (e) => {
    console.error('❌ Greška pri slanju zahteva:', e.message);
  });

  req.write(postData);
  req.end();
};

testSMSDirect();