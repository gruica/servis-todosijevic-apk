import fetch from 'node-fetch';

// Test da proverim manufacturer podatke za servis 164
console.log('🔬 PROVERAVA MANUFACTURER PODATKE ZA SERVIS 164');

async function checkManufacturer() {
  try {
    // Admin login
    const loginResponse = await fetch('https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/api/jwt-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'jelena@frigosistemtodosijevic.me',
        password: 'admin123'
      })
    });
    
    const loginResult = await loginResponse.json();
    if (!loginResponse.ok) {
      console.log('❌ Login failed:', loginResult.error);
      return;
    }
    
    console.log('✅ Admin login uspešan');
    const token = loginResult.token;
    
    // Dohvati service podatke
    const serviceResponse = await fetch('https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/api/admin/services/164', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!serviceResponse.ok) {
      console.log('❌ Service fetch failed:', serviceResponse.status);
      return;
    }
    
    const serviceData = await serviceResponse.json();
    console.log('📊 Servis podaci:');
    console.log(`   ID: ${serviceData.id}`);
    console.log(`   Appliance ID: ${serviceData.applianceId}`);
    console.log(`   Status: ${serviceData.status}`);
    
    if (serviceData.appliance) {
      console.log('🔧 Podaci o aparatu:');
      console.log(`   Kategorija ID: ${serviceData.appliance.categoryId}`);
      console.log(`   Manufacturer ID: ${serviceData.appliance.manufacturerId}`);
      
      if (serviceData.appliance.category) {
        console.log(`   Kategorija ime: ${serviceData.appliance.category.name}`);
      }
      
      if (serviceData.appliance.manufacturer) {
        console.log(`   Manufacturer ime: ${serviceData.appliance.manufacturer.name}`);
        console.log(`   Manufacturer ime (lowercase): ${serviceData.appliance.manufacturer.name.toLowerCase()}`);
        console.log(`   Da li je 'beko'?: ${serviceData.appliance.manufacturer.name.toLowerCase() === 'beko'}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Greška:', error.message);
  }
}

checkManufacturer();