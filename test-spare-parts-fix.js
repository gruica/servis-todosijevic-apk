// Test script za spare parts endpoint issue
import axios from 'axios';

const BASE_URL = 'https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev';

async function testSparePartsEndpoint() {
  try {
    console.log('🔄 Testing spare parts endpoint...');
    
    // Prvo se uloguj kao admin
    const loginResponse = await axios.post(`${BASE_URL}/api/jwt-login`, {
      username: 'jelena@frigosistemtodosijevic.me',
      password: 'jelena123'
    });
    
    console.log('✅ Login successful');
    const token = loginResponse.data.token;
    
    // Testiraj pending spare parts endpoint
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    const pendingResponse = await axios.get(`${BASE_URL}/api/admin/spare-parts/pending`, { headers });
    console.log('✅ Pending spare parts endpoint working:', pendingResponse.data.length, 'pending orders');
    
    // Test all spare parts endpoint
    const allResponse = await axios.get(`${BASE_URL}/api/admin/spare-parts`, { headers });
    console.log('✅ All spare parts endpoint working:', allResponse.data.length, 'total orders');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testSparePartsEndpoint();