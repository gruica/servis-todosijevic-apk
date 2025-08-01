// Jednostavan test ComPlus email funkcionalnosti nakon dodavanja sendTestEmail
const axios = require('axios');

async function simpleComplusTest() {
  console.log('🧪 JEDNOSTAVAN COMPLUS TEST');
  console.log('===========================');
  
  const baseUrl = 'https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev';
  
  try {
    console.log('📧 Pozivam test endpoint...');
    
    const response = await axios.post(`${baseUrl}/api/test-complus-email`, {}, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 15000
    });
    
    console.log('');
    console.log('📨 ODGOVOR SERVERA:');
    console.log('Status:', response.status);
    console.log('Headers:', response.headers['content-type']);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.success) {
      console.log('');
      console.log('✅ SUCCESS! ComPlus test email je uspešno poslat!');
      console.log('📬 Email poslat na: gruica@frigosistemtodosijevic.com');
      console.log('🏭 ComPlus email sistem je operativan');
    } else {
      console.log('');
      console.log('❌ Test nije uspešan:', response.data);
    }
    
  } catch (error) {
    console.log('');
    console.log('❌ GREŠKA:');
    
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Headers:', error.response.headers['content-type']);
      
      // Proveri da li je vraćen HTML umesto JSON
      if (error.response.headers['content-type']?.includes('text/html')) {
        console.log('⚠️ Server je vratio HTML umesto JSON - možda je Vite proxy u problemu');
        console.log('HTML sadržaj (prvi red):', error.response.data.substring(0, 100));
      } else {
        console.log('Data:', error.response.data);
      }
    } else {
      console.error('Request error:', error.message);
    }
  }
}

simpleComplusTest();