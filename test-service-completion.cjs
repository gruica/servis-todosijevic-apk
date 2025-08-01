// Test završetka servisa kroz axios sa login i cookie
const axios = require('axios');

async function testFullEmailFlow() {
  console.log('🧪 Test ComPlus email notifikacije sa loginom...');
  
  const baseUrl = 'https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev';
  
  try {
    // 1. Login da dobijemo session cookie
    console.log('🔐 Logovanje...');
    const loginResponse = await axios.post(`${baseUrl}/api/auth/login`, {
      username: 'jelena@frigosistemtodosijevic.me',
      password: 'JelenaAdmin2024!'
    }, {
      withCredentials: true,
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ Login uspešan');
    
    // 2. Dobijemo cookie iz login response
    const cookies = loginResponse.headers['set-cookie'];
    if (!cookies) {
      throw new Error('Nema cookie-ja u login odgovoru');
    }
    
    // 3. Koristi cookie za završetak servisa
    console.log('📝 Završavam ComPlus servis ID 186...');
    
    const updateResponse = await axios.put(`${baseUrl}/api/services/186`, {
      status: 'completed',
      technicianNotes: 'Test završetka ComPlus servisa - email notifikacija test'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies.join('; ')
      }
    });
    
    console.log('✅ Servis uspešno završen!');
    console.log('📧 Proverite email logove za ComPlus notifikaciju');
    console.log('📨 Očekivano: email poslat na servis@complus.me');
    
  } catch (error) {
    console.error('❌ Greška:', error.response?.data || error.message);
  }
}

testFullEmailFlow();