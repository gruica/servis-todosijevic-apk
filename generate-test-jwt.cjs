const fetch = require('node-fetch');

// Generiši JWT token za testiranje web scraping-a
async function generateTestJWT() {
  try {
    console.log('🔐 Generišem JWT token za web scraping test...');
    
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Login greška:', errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ JWT Token generisan:', data.token);
    console.log('👤 Korisnik:', data.user.fullName, '(' + data.user.role + ')');
    
    return data.token;
    
  } catch (error) {
    console.error('❌ Greška pri generisanju JWT:', error.message);
  }
}

generateTestJWT();