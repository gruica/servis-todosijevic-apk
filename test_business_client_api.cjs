const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

async function testBusinessClientAPI() {
  try {
    // Kreiram admin JWT token za testiranje
    const adminToken = jwt.sign(
      { userId: 10, username: 'jelena@frigosistemtodosijevic.me', role: 'admin' },
      'secret-key-for-jwt-authentication-in-replit',
      { expiresIn: '1h' }
    );

    console.log('🧪 Testiram /api/business/clients endpoint...');

    // Test business clients GET endpoint
    const response = await fetch('http://localhost:5000/api/business/clients', {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Response type:', typeof data);
      console.log('✅ Broj klijenata:', Array.isArray(data) ? data.length : 'Nije array');
      if (Array.isArray(data) && data.length > 0) {
        console.log('✅ Prvi klijent:', data[0]);
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Error response:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Greška pri testiranju:', error.message);
  }
}

testBusinessClientAPI();
