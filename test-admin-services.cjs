const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

const BASE_URL = "https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev";
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET environment variable not found');
  process.exit(1);
}

async function testAdminServices() {
  console.log('🔍 TESTIRANJE ADMIN SERVISA');
  console.log('============================================================\n');

  try {
    // Kreiraj admin token
    const adminToken = jwt.sign({ userId: 10, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });

    // Test 1: Admin servisi endpoint
    console.log('📋 TEST 1: Dohvatanje admin servisa');
    console.log('--------------------------------------------------');
    
    const servicesResponse = await fetch(`${BASE_URL}/api/admin/services`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!servicesResponse.ok) {
      console.log(`❌ Admin servisi FAILED: ${servicesResponse.status} ${servicesResponse.statusText}`);
      const errorText = await servicesResponse.text();
      console.log('Error response:', errorText.substring(0, 200));
      return;
    }

    const responseText = await servicesResponse.text();
    console.log('Response preview:', responseText.substring(0, 200));
    
    let services;
    try {
      services = JSON.parse(responseText);
    } catch (parseError) {
      console.log('❌ JSON parse greška:', parseError.message);
      console.log('Response text:', responseText.substring(0, 500));
      return;
    }
    console.log(`✅ Admin vidi ${services.length} servisa`);

    if (services.length > 0) {
      console.log('📊 Primeri servisa:');
      services.slice(0, 3).forEach((service, index) => {
        console.log(`   ${index + 1}. Servis #${service.id} - Status: ${service.status} - Klijent: ${service.client?.fullName || 'N/A'}`);
      });
    }

    // Test 2: Statistike
    console.log('\n📊 TEST 2: Admin statistike');
    console.log('--------------------------------------------------');
    
    const statsResponse = await fetch(`${BASE_URL}/api/admin/stats`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      console.log(`✅ Statistike: ${stats.totalServices} ukupno servisa, ${stats.activeServices} aktivnih`);
    } else {
      console.log(`⚠️ Statistike FAILED: ${statsResponse.status}`);
    }

    // Test 3: Servisi po tehničarima
    console.log('\n👥 TEST 3: Servisi po tehničarima');
    console.log('--------------------------------------------------');
    
    const techServicesResponse = await fetch(`${BASE_URL}/api/admin/services-by-technicians`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (techServicesResponse.ok) {
      const techServices = await techServicesResponse.json();
      console.log(`✅ Servisi po tehničarima: ${techServices.length} servisa`);
    } else {
      console.log(`⚠️ Servisi po tehničarima FAILED: ${techServicesResponse.status}`);
    }

  } catch (error) {
    console.error('❌ Greška tokom testiranja:', error.message);
  }
}

testAdminServices();