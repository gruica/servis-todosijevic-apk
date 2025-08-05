const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

async function testBusiness() {
  try {
    // Kreiram admin JWT token
    const adminToken = jwt.sign(
      { userId: 10, username: 'jelena@frigosistemtodosijevic.me', role: 'admin' },
      'AdamEva230723@',
      { expiresIn: '1h' }
    );

    console.log('🧪 === FINALNI TEST BUSINESS CLIENTS API ===');

    // Test 1: Business clients GET
    console.log('\n1️⃣ Testiram GET /api/business/clients...');
    const getResponse = await fetch('http://localhost:5000/api/business/clients', {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Status:', getResponse.status);
    
    if (getResponse.ok) {
      const clients = await getResponse.json();
      console.log('✅ JSON odgovor uspešno parsiran');
      console.log('✅ Tip:', typeof clients);
      console.log('✅ Broj klijenata:', Array.isArray(clients) ? clients.length : 'Nije array');
      
      if (Array.isArray(clients) && clients.length > 0) {
        console.log('✅ Prvi klijent primer:', {
          id: clients[0].id,
          fullName: clients[0].fullName,
          phone: clients[0].phone
        });
      }
      
      // Test 2: Business client update ako imamo klijente
      if (Array.isArray(clients) && clients.length > 0) {
        const testClientId = clients[0].id;
        console.log(`\n2️⃣ Testiram PUT /api/business/clients/${testClientId}...`);
        
        const updateData = {
          fullName: clients[0].fullName + ' (TEST)',
          phone: clients[0].phone,
          email: clients[0].email,
          address: clients[0].address,
          city: clients[0].city
        };
        
        const putResponse = await fetch(`http://localhost:5000/api/business/clients/${testClientId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        });
        
        console.log('✅ Update status:', putResponse.status);
        const updateResult = await putResponse.json();
        console.log('✅ Update response:', {
          success: updateResult.success,
          message: updateResult.message,
          fullName: updateResult.fullName
        });
      }
      
    } else {
      const errorText = await getResponse.text();
      console.log('❌ Error response:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Greška pri testiranju:', error.message);
  }
}

testBusiness();
