// Test Com Plus assign technician functionality
import axios from 'axios';

const BASE_URL = 'https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjQzLCJ1c2VybmFtZSI6InRlb2RvcmFAZnJpZ29zaXN0ZW10b2Rvc2lqZXZpYy5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NTM1MTI0NzcsImV4cCI6MTc1NjEwNDQ3N30.FIOTG410GmcwMePxQygqGdgU8jHTYWRUH8Pdrrerqn8';

async function testComplusAssign() {
  try {
    console.log('🔄 Testiram Com Plus assign technician...');
    
    // Test assignment
    const assignResponse = await axios.put(`${BASE_URL}/api/admin/services/160/assign-technician`, {
      technicianId: 1
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Assign response:', assignResponse.status, assignResponse.data);
    
    // Check if service was updated
    const servicesResponse = await axios.get(`${BASE_URL}/api/complus/services`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const service160 = servicesResponse.data.find(s => s.id === 160);
    console.log('✅ Service 160 nakon dodele:');
    console.log('  - technicianId:', service160?.technicianId);
    console.log('  - technicianName:', service160?.technicianName);
    console.log('✅ Ukupno Com Plus servisa:', servicesResponse.data.length);
    
  } catch (error) {
    console.error('❌ Assign greška:', error.response?.data || error.message);
  }
}

testComplusAssign();