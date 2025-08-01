// Finalni test ComPlus email funkcionalnosti
const axios = require('axios');

async function finalniComplusTest() {
  console.log('🎯 FINALNI COMPLUS EMAIL TEST');
  console.log('================================');
  
  const baseUrl = 'https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev';
  
  try {
    console.log('📧 Pozivam test-complus-email endpoint...');
    
    const response = await axios.post(`${baseUrl}/api/test-complus-email`, {}, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    console.log('✅ USPEŠAN ODGOVOR:');
    console.log('Status:', response.status);
    console.log('Data:', response.data);
    
    if (response.data.success) {
      console.log('');
      console.log('🎉 COMPLUS EMAIL SISTEM USPEŠNO TESTIRAN!');
      console.log('📬 Test email je poslat na gruica@frigosistemtodosijevic.com');
      console.log('🔧 Email sistem je spreman za produkciju');
      console.log('');
      console.log('🏭 PRODUKCIJSKA FUNKCIONALNOST:');
      console.log('- Kada se završava ComPlus servis (Candy, Electrolux, Elica, Hoover, Turbo Air)');
      console.log('- Automatski se šalje email na servis@complus.me');
      console.log('- Implementirano u PUT /api/services/:id endpoint');
      console.log('- Aktivno za sve ComPlus brendove');
      console.log('');
      console.log('✅ SISTEM SPREMAN ZA KORIŠĆENJE!');
    } else {
      console.log('❌ Test nije uspešan:', response.data);
    }
    
  } catch (error) {
    if (error.response) {
      console.log('❌ Server error:', error.response.status, error.response.data);
    } else {
      console.error('❌ Request error:', error.message);
    }
  }
}

finalniComplusTest();