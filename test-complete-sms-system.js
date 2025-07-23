/**
 * Testiranje kompletnog automatiper SMS sistema za Frigo Sistem Todosijević
 * Ovaj test pokreće sve SMS obaveštenja za rezervne delove u sekvenci
 */

async function testCompleteSparePartsSMSSystem() {
  const baseUrl = 'https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev';
  const testResults = [];

  console.log('🚀 TESTIRANJE KOMPLETNOG SMS SISTEMA ZA REZERVNE DELOVE');
  console.log('====================================================');

  // Test 1: Admin spare parts order sa SMS triggerima
  try {
    console.log('\n1. Testiranje admin spare parts order sa SMS triggerima...');
    
    // Mock login token (koristimo postojeći JWT token)
    const adminToken = process.env.ADMIN_JWT_TOKEN || 'mock-admin-token';
    
    const adminOrderResponse = await fetch(`${baseUrl}/api/admin/spare-parts/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        brand: 'electrolux',
        deviceModel: 'EWF1287HDW',
        applianceCategory: 'Veš mašina',
        productCode: 'VES-PUMP-001',
        partName: 'Pumpa za vodu',
        quantity: 1,
        description: 'Rezervni deo za veš mašinu - testiranje SMS sistema',
        warrantyStatus: 'u garanciji',
        urgency: 'normal',
        serviceId: 157 // Test servis ID
      })
    });

    if (adminOrderResponse.ok) {
      const result = await adminOrderResponse.json();
      console.log('✅ Admin spare parts order uspešan:', result.message);
      testResults.push({ test: 'Admin Order SMS', status: 'SUCCESS', details: result.message });
    } else {
      console.log('❌ Admin spare parts order neuspešan:', adminOrderResponse.status);
      testResults.push({ test: 'Admin Order SMS', status: 'FAILED', details: `HTTP ${adminOrderResponse.status}` });
    }
  } catch (error) {
    console.log('❌ Greška u admin order testu:', error.message);
    testResults.push({ test: 'Admin Order SMS', status: 'ERROR', details: error.message });
  }

  // Test 2: Spare parts arrival notifikacija
  try {
    console.log('\n2. Testiranje spare parts arrival obaveštenja...');
    
    const arrivalResponse = await fetch(`${baseUrl}/api/spare-parts/1/notify-arrival`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    });

    if (arrivalResponse.ok) {
      const result = await arrivalResponse.json();
      console.log('✅ Spare parts arrival obaveštenje uspešno poslato');
      testResults.push({ test: 'Parts Arrival SMS', status: 'SUCCESS', details: 'Obaveštenje poslato klijentima i poslovnim partnerima' });
    } else {
      console.log('❌ Spare parts arrival obaveštenje neuspešno:', arrivalResponse.status);
      testResults.push({ test: 'Parts Arrival SMS', status: 'FAILED', details: `HTTP ${arrivalResponse.status}` });
    }
  } catch (error) {
    console.log('❌ Greška u arrival notification testu:', error.message);
    testResults.push({ test: 'Parts Arrival SMS', status: 'ERROR', details: error.message });
  }

  // Test 3: Direct SMS konfiguracija test
  try {
    console.log('\n3. Testiranje direktne SMS konfiguracije...');
    
    const smsTestResponse = await fetch(`${baseUrl}/api/sms-mobile-api/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        phoneNumber: '067077092',
        message: 'Test poruka - kompletni SMS sistem za rezervne delove je operacionalan! 📱'
      })
    });

    if (smsTestResponse.ok) {
      const result = await smsTestResponse.json();
      console.log('✅ Direktni SMS test uspešan, Message ID:', result.message_id);
      testResults.push({ test: 'Direct SMS Test', status: 'SUCCESS', details: `Message ID: ${result.message_id}` });
    } else {
      console.log('❌ Direktni SMS test neuspešan:', smsTestResponse.status);
      testResults.push({ test: 'Direct SMS Test', status: 'FAILED', details: `HTTP ${smsTestResponse.status}` });
    }
  } catch (error) {
    console.log('❌ Greška u direktnom SMS testu:', error.message);
    testResults.push({ test: 'Direct SMS Test', status: 'ERROR', details: error.message });
  }

  // Test rezultati
  console.log('\n📊 SUMARNI REZULTATI TESTIRANJA');
  console.log('===============================');
  
  let successCount = 0;
  let failedCount = 0;
  let errorCount = 0;

  testResults.forEach((result, index) => {
    const icon = result.status === 'SUCCESS' ? '✅' : result.status === 'FAILED' ? '❌' : '⚠️';
    console.log(`${icon} ${index + 1}. ${result.test}: ${result.status}`);
    console.log(`   Detalji: ${result.details}`);
    
    if (result.status === 'SUCCESS') successCount++;
    else if (result.status === 'FAILED') failedCount++;
    else errorCount++;
  });

  console.log('\n📈 FINALNA STATISTIKA:');
  console.log(`   ✅ Uspešno: ${successCount}/${testResults.length}`);
  console.log(`   ❌ Neuspešno: ${failedCount}/${testResults.length}`);
  console.log(`   ⚠️  Greške: ${errorCount}/${testResults.length}`);
  
  if (successCount === testResults.length) {
    console.log('\n🎉 SVI TESTOVI USPEŠNI! SMS sistem za rezervne delove je potpuno operacionalan!');
  } else {
    console.log('\n⚠️  Neki testovi nisu uspešni. Proverite logove za detalje.');
  }
}

// Pokretanje testiranja
testCompleteSparePartsSMSSystem().catch(console.error);