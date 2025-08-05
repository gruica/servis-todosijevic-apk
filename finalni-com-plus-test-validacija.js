const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

async function testBusinessPartnerLogic() {
  try {
    console.log('🧪 === FINALNI TEST BUSINESS PARTNER LOGIC ===\n');

    // 1. Test sa business partner tokenom
    const businessPartnerToken = jwt.sign(
      { userId: 19, username: 'robert.ivezic@tehnoplus.me', role: 'business_partner' },
      'AdamEva230723@',
      { expiresIn: '1h' }
    );

    console.log('1️⃣ Test sa BUSINESS PARTNER pristupom...');
    const bpResponse = await fetch('http://localhost:5000/api/business/clients', {
      headers: {
        'Authorization': `Bearer ${businessPartnerToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ BP Status:', bpResponse.status);
    
    if (bpResponse.ok) {
      const bpClients = await bpResponse.json();
      console.log('✅ BP Klijenti: ', bpClients.length, 'klijenata');
      if (bpClients.length > 0) {
        console.log('✅ Primer BP klijenta:', {
          id: bpClients[0].id,
          fullName: bpClients[0].fullName,
          phone: bpClients[0].phone
        });
      } else {
        console.log('ℹ️  Business partner nema svoje klijente (pravilno filtriranje)');
      }
    } else {
      console.log('❌ BP Error:', await bpResponse.text());
    }

    // 2. Test sa admin tokenom za poređenje
    const adminToken = jwt.sign(
      { userId: 10, username: 'jelena@frigosistemtodosijevic.me', role: 'admin' },
      'AdamEva230723@',
      { expiresIn: '1h' }
    );

    console.log('\n2️⃣ Test sa ADMIN pristupom za poređenje...');
    const adminResponse = await fetch('http://localhost:5000/api/business/clients', {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Admin Status:', adminResponse.status);
    
    if (adminResponse.ok) {
      const adminClients = await adminResponse.json();
      console.log('✅ Admin Klijenti:', adminClients.length, 'klijenata');
    } else {
      console.log('❌ Admin Error:', await adminResponse.text());
    }

    // 3. Test servisa za business partnera
    console.log('\n3️⃣ Test SERVISA za business partnera...');
    const servicesResponse = await fetch('http://localhost:5000/api/business/services', {
      headers: {
        'Authorization': `Bearer ${businessPartnerToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Services Status:', servicesResponse.status);
    
    if (servicesResponse.ok) {
      const services = await servicesResponse.json();
      console.log('✅ BP Servisi:', services.length, 'servisa');
      if (services.length > 0) {
        console.log('✅ Primer BP servisa:', {
          id: services[0].id,
          description: services[0].description.substring(0, 50) + '...',
          status: services[0].status
        });
      }
    } else {
      console.log('❌ Services Error:', await servicesResponse.text());
    }

    console.log('\n🏁 === TEST ZAVRŠEN ===');
    
  } catch (error) {
    console.error('❌ Greška pri testiranju:', error.message);
  }
}

testBusinessPartnerLogic();
