#!/usr/bin/env node

// Test konekcije za novo SmsMobile API - proverava da li je API dostupan
import fetch from 'node-fetch';

console.log('🔍 TESTIRAM SMSMOBILE API KONEKCIJU');
console.log('📱 Target: SmsMobile API servis');
console.log('=' .repeat(60));

// Test 1: Osnovni API endpoint status
async function testAPIStatus() {
  console.log('🌐 Test 1: API Status endpoint...');
  
  try {
    const response = await fetch('https://api.smsmobile.rs/api/v1/status', {
      method: 'GET',
      timeout: 5000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Frigo-Sistem-SMS-Mobile-Test/1.0'
      }
    });
    
    console.log(`✅ API odgovor: ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.log(`📄 Sadržaj: ${text.substring(0, 200)}...`);
    return true;
  } catch (error) {
    console.log(`❌ API greška: ${error.message}`);
    return false;
  }
}

// Test 2: API dokumentacija/info endpoint
async function testAPIInfo() {
  console.log('📖 Test 2: API Info endpoint...');
  
  try {
    const response = await fetch('https://api.smsmobile.rs/api/v1', {
      method: 'GET',
      timeout: 5000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Frigo-Sistem-SMS-Mobile-Test/1.0'
      }
    });
    
    console.log(`✅ Info odgovor: ${response.status}`);
    const text = await response.text();
    console.log(`📄 Info: ${text.substring(0, 300)}...`);
    return true;
  } catch (error) {
    console.log(`❌ Info greška: ${error.message}`);
    return false;
  }
}

// Test 3: DNS rezolucija za SmsMobile domene
async function testDNSResolution() {
  console.log('🔍 Test 3: DNS rezolucija...');
  
  try {
    // Test osnovnog API domena
    const response = await fetch('https://smsmobile.rs', {
      method: 'HEAD',
      timeout: 5000
    });
    
    console.log(`✅ SmsMobile domen dostupan: ${response.status}`);
    return true;
  } catch (error) {
    console.log(`❌ DNS greška: ${error.message}`);
    return false;
  }
}

// Test 4: Replit mrežna konfiguracija
async function testNetworkConfig() {
  console.log('🌍 Test 4: Replit mrežna konfiguracija...');
  
  try {
    // Test Replit-ove javne IP adrese
    const ipResponse = await fetch('https://httpbin.org/ip', { timeout: 5000 });
    const ipData = await ipResponse.json();
    console.log(`📍 Replit javna IP: ${ipData.origin}`);
    
    // Test HTTPS konekcije
    const httpsResponse = await fetch('https://api.github.com', { timeout: 5000 });
    console.log(`🔒 HTTPS test: ${httpsResponse.status}`);
    
    return true;
  } catch (error) {
    console.log(`❌ Mrežna konfiguracija: ${error.message}`);
    return false;
  }
}

// Test 5: Mock API poziv sa test API ključem
async function testMockAPICall() {
  console.log('🧪 Test 5: Mock API poziv...');
  
  try {
    const testAPIKey = 'test-api-key-12345';
    
    const response = await fetch('https://api.smsmobile.rs/api/v1/send', {
      method: 'POST',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Frigo-Sistem-SMS-Mobile-Test/1.0'
      },
      body: JSON.stringify({
        api_key: testAPIKey,
        to: '067000000',
        text: 'Test poruka sa Replit servera',
        gateway: 'default'
      })
    });
    
    console.log(`📱 Mock API odgovor: ${response.status}`);
    const text = await response.text();
    console.log(`📄 Odgovor: ${text.substring(0, 300)}...`);
    
    // Očekujemo 401/403 grešku zbog test API ključa, što je OK
    if (response.status === 401 || response.status === 403) {
      console.log(`✅ Očekivana greška autentifikacije - API radi!`);
      return true;
    }
    
    return response.ok;
  } catch (error) {
    console.log(`❌ Mock API greška: ${error.message}`);
    return false;
  }
}

// Pokreni sve testove
async function runAllTests() {
  console.log(`⏰ Vreme testa: ${new Date().toLocaleString('sr-RS')}\n`);
  
  const test1 = await testAPIStatus();
  console.log('');
  
  const test2 = await testAPIInfo();
  console.log('');
  
  const test3 = await testDNSResolution();
  console.log('');
  
  const test4 = await testNetworkConfig();
  console.log('');
  
  const test5 = await testMockAPICall();
  console.log('');
  
  console.log('📊 REZULTATI TESTOVA:');
  console.log(`API Status: ${test1 ? '✅ RADI' : '❌ NE RADI'}`);
  console.log(`API Info: ${test2 ? '✅ RADI' : '❌ NE RADI'}`);
  console.log(`DNS rezolucija: ${test3 ? '✅ RADI' : '❌ NE RADI'}`);
  console.log(`Mrežna konfiguracija: ${test4 ? '✅ RADI' : '❌ NE RADI'}`);
  console.log(`Mock API poziv: ${test5 ? '✅ RADI' : '❌ NE RADI'}`);
  
  const totalPassed = [test1, test2, test3, test4, test5].filter(Boolean).length;
  
  if (totalPassed >= 3) {
    console.log('\n🎉 DIJAGNOZA: SmsMobile API je dostupan i spreman za konfiguraciju!');
    console.log('   Potrebno je samo uneti ispravan API ključ u admin panel.');
  } else if (totalPassed >= 1) {
    console.log('\n⚠️ DIJAGNOZA: Delimična dostupnost - proveri mrežnu konekciju');
  } else {
    console.log('\n🚨 DIJAGNOZA: SmsMobile API nije dostupan - mrežni problemi');
  }
  
  console.log('\n📝 SLEDEĆI KORACI:');
  console.log('1. Otvorite SmsMobile aplikaciju na telefonu');
  console.log('2. Idite na "My API Key" sekciju');
  console.log('3. Kopirajte API ključ');
  console.log('4. Unesite ga u admin panel na /admin/sms-mobile-config');
  console.log('5. Testirajte slanje SMS-a');
}

runAllTests().catch(console.error);