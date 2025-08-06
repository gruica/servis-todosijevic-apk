const https = require('https');

// Test direktno preko API-ja
const data = JSON.stringify({
  "fullName": "DIREKTAN TEST IZMENA",
  "phone": "063999888",
  "address": "Test adresa 123",
  "city": "Test grad",
  "email": "direktan@test.com"
});

// Prvo se prijavim
const loginData = JSON.stringify({
  "username": "robert.ivezic@tehnoplus.me", 
  "password": "pass123"
});

// Login zahtev
const loginOptions = {
  hostname: '883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev',
  port: 443,
  path: '/api/jwt-login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(loginData)
  }
};

console.log('🔐 Pokušavam login...');
const loginReq = https.request(loginOptions, (loginRes) => {
  console.log(`Login status: ${loginRes.statusCode}`);
  
  let loginResponseData = '';
  loginRes.on('data', (chunk) => {
    loginResponseData += chunk;
  });
  
  loginRes.on('end', () => {
    console.log('Login response:', loginResponseData);
    
    try {
      const loginResult = JSON.parse(loginResponseData);
      const token = loginResult.token;
      
      if (!token) {
        console.error('❌ Nema tokena u login odgovoru!');
        return;
      }
      
      console.log('✅ Token dobijen:', token.substring(0, 20) + '...');
      
      // Sada testiram PUT zahtev sa tokenom
      const putOptions = {
        hostname: '883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev',
        port: 443,
        path: '/api/business/clients/264', // ID prvog klijenta
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Content-Length': Buffer.byteLength(data)
        }
      };
      
      console.log('🔄 Pokušavam PUT zahtev...');
      const putReq = https.request(putOptions, (putRes) => {
        console.log(`PUT status: ${putRes.statusCode}`);
        console.log('PUT headers:', putRes.headers);
        
        let putResponseData = '';
        putRes.on('data', (chunk) => {
          putResponseData += chunk;
        });
        
        putRes.on('end', () => {
          console.log('PUT response:', putResponseData);
        });
      });
      
      putReq.on('error', (e) => {
        console.error('PUT error:', e);
      });
      
      putReq.write(data);
      putReq.end();
      
    } catch (parseError) {
      console.error('❌ Login response parse error:', parseError);
      console.error('Raw response:', loginResponseData);
    }
  });
});

loginReq.on('error', (e) => {
  console.error('Login error:', e);
});

loginReq.write(loginData);
loginReq.end();