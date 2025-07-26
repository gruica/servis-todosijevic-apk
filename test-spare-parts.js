// Test script to check spare parts endpoints
import axios from 'axios';

const BASE_URL = 'https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev';
const JWT_TOKEN = process.env.TEST_JWT_TOKEN || (() => {
  console.error('🚨 TEST ERROR: TEST_JWT_TOKEN environment variable is required');
  throw new Error('TEST_JWT_TOKEN environment variable must be set for testing');
})();

async function testSparePartsEndpoints() {
  const headers = {
    'Authorization': `Bearer ${JWT_TOKEN}`,
    'Content-Type': 'application/json'
  };

  try {
    console.log('Testing pending spare parts endpoint...');
    const pendingResponse = await axios.get(`${BASE_URL}/api/admin/spare-parts/pending`, { headers });
    console.log('Pending spare parts:', pendingResponse.data);
    
    console.log('Testing available parts endpoint...');
    const availableResponse = await axios.get(`${BASE_URL}/api/admin/available-parts`, { headers });
    console.log('Available parts count:', availableResponse.data.length);
    console.log('First available part:', availableResponse.data[0]);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testSparePartsEndpoints();