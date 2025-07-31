const axios = require('axios');

async function testSMSCompletion() {
  try {
    console.log('🎯 Testiram SMS completion endpoint...');
    
    const response = await axios.post('http://127.0.0.1:5000/api/services/182/send-completion-sms', {}, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjM4LCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzUzOTkwNjc2LCJleHAiOjE3NTY1ODI2NzZ9.EbWrBTQ2fLjmoJU_EEzucn4VXOj_PKKy2N5nBt6yyMc'
      },
      timeout: 10000
    });
    
    console.log('✅ Response status:', response.status);
    console.log('✅ Response data:', response.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.status, error.response?.data || error.message);
  }
}

testSMSCompletion();