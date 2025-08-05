const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

async function testBusinessClientAPI() {
  try {
    // Kreiram admin JWT token sa pravim secret-om
    const adminToken = jwt.sign(
      { userId: 10, username: 'jelena@frigosistemtodosijevic.me', role: 'admin' },
      'AdamEva230723@',
      { expiresIn: '1h' }
    );

    console.log('🧪 Testiram /api/business/clients endpoint...');
    console.log('🔑 Token:', adminToken.substring(0, 50) + '...');

    // Test business clients GET endpoint
    const response = await fetch('http://localhost:5000/api/business/clients', {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Status:', response.status);
    console.log('✅ Headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('✅ Response text:', responseText.substring(0, 200));
    
    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        console.log('✅ Parsed JSON, tip:', typeof data);
        console.log('✅ Broj klijenata:', Array.isArray(data) ? data.length : 'Nije array');
        if (Array.isArray(data) && data.length > 0) {
          console.log('✅ Prvi klijent:', data[0]);
        }
      } catch (e) {
        console.log('❌ Response nije valjan JSON:', e.message);
      }
    } else {
      console.log('❌ Error response:', responseText);
    }
    
  } catch (error) {
    console.error('❌ Greška pri testiranju:', error.message);
  }
}

testBusinessClientAPI();
