// Test Com Plus login funkcionalnosti
import axios from 'axios';

const BASE_URL = 'https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev';

async function testComplusLogin() {
  try {
    console.log('🔄 Testiram Com Plus login...');
    
    const response = await axios.post(`${BASE_URL}/api/jwt-login`, {
      username: 'teodora@frigosistemtodosijevic.com',
      password: 'Teodora123'
    });
    
    console.log('✅ Login uspešan!');
    console.log('Token:', response.data.token);
    console.log('User:', response.data.user);
    
    // Test Com Plus servisa sa novim token-om
    const token = response.data.token;
    const servicesResponse = await axios.get(`${BASE_URL}/api/complus/services`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Com Plus servisi dostupni:', servicesResponse.data.length);
    
  } catch (error) {
    console.error('❌ Login greška:', error.response?.data || error.message);
  }
}

testComplusLogin();