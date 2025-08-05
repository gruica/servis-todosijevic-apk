const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

async function testWithNewToken() {
  try {
    console.log('🧪 === TEST SA NOVIM TOKENOM ===\n');

    // Novi business partner token
    const businessPartnerToken = jwt.sign(
      { userId: 19, username: 'robert.ivezic@tehnoplus.me', role: 'business_partner' },
      'AdamEva230723@',
      { expiresIn: '30m' }
    );

    console.log('1️⃣ Testiranje sa Business Partner tokenom...');
    const response = await fetch('http://localhost:5000/api/business/clients', {
      headers: {
        'Authorization': `Bearer ${businessPartnerToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Status:', response.status);
    
    if (response.ok) {
      const clients = await response.json();
      console.log('Uspeh! Broj klijenata:', clients.length);
      if (clients.length > 0) {
        console.log('Prvi klijent:', clients[0]);
      }
    } else {
      const error = await response.text();
      console.log('Greška:', error);
    }
    
  } catch (error) {
    console.error('Greška:', error.message);
  }
}

testWithNewToken();
