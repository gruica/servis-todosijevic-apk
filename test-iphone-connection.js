#!/usr/bin/env node

// Test direktne konekcije između Replit-a i iPhone SMS Gateway
import fetch from 'node-fetch';
import { createConnection } from 'net';

const IPHONE_IP = '77.222.25.100';
const PORT = 8080;

console.log('🔍 TESTIRAM KONEKCIJU REPLIT → iPhone SMS Gateway');
console.log(`📱 Target: ${IPHONE_IP}:${PORT}`);
console.log('=' .repeat(60));

// Test 1: TCP socket konekcija
async function testTCPConnection() {
  return new Promise((resolve) => {
    console.log('🔌 Test 1: TCP Socket konekcija...');
    
    const socket = createConnection({
      host: IPHONE_IP,
      port: PORT,
      timeout: 5000
    });

    socket.on('connect', () => {
      console.log('✅ TCP konekcija USPEŠNA!');
      socket.destroy();
      resolve(true);
    });

    socket.on('timeout', () => {
      console.log('⏰ TCP timeout - server možda nije pokrenut');
      socket.destroy();
      resolve(false);
    });

    socket.on('error', (err) => {
      console.log(`❌ TCP greška: ${err.message}`);
      resolve(false);
    });
  });
}

// Test 2: HTTP GET zahtev
async function testHTTPConnection() {
  console.log('🌐 Test 2: HTTP GET zahtev...');
  
  try {
    const response = await fetch(`http://${IPHONE_IP}:${PORT}/`, {
      method: 'GET',
      timeout: 5000,
      headers: {
        'User-Agent': 'Replit-SMS-Gateway-Test/1.0'
      }
    });
    
    console.log(`✅ HTTP odgovor: ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.log(`📄 Sadržaj: ${text.substring(0, 200)}...`);
    return true;
  } catch (error) {
    console.log(`❌ HTTP greška: ${error.message}`);
    return false;
  }
}

// Test 3: SMS Gateway specifični endpoint
async function testSMSGatewayEndpoint() {
  console.log('📱 Test 3: SMS Gateway endpoint...');
  
  try {
    const formData = new URLSearchParams();
    formData.append('Phonenumber', '067000000');
    formData.append('message', 'Test konekcije sa Replit servera');
    formData.append('User', 'gruica');
    formData.append('Password', 'AdamEva230723@');

    const response = await fetch(`http://${IPHONE_IP}:${PORT}/`, {
      method: 'POST',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Replit-SMS-Gateway-Test/1.0'
      },
      body: formData.toString()
    });
    
    console.log(`✅ SMS Gateway odgovor: ${response.status}`);
    const text = await response.text();
    console.log(`📄 Odgovor: ${text.substring(0, 300)}...`);
    return true;
  } catch (error) {
    console.log(`❌ SMS Gateway greška: ${error.message}`);
    return false;
  }
}

// Test 4: Mrežne informacije
async function testNetworkInfo() {
  console.log('🌍 Test 4: Mrežne informacije...');
  
  try {
    // Test Replit-ove vanjske IP adrese
    const ipResponse = await fetch('https://httpbin.org/ip', { timeout: 5000 });
    const ipData = await ipResponse.json();
    console.log(`📍 Replit javna IP: ${ipData.origin}`);
    
    // Test DNS rezolucije
    console.log(`🔍 DNS lookup za ${IPHONE_IP}...`);
    
    return true;
  } catch (error) {
    console.log(`❌ Mrežne informacije: ${error.message}`);
    return false;
  }
}

// Pokreni sve testove
async function runAllTests() {
  console.log(`⏰ Vreme testa: ${new Date().toLocaleString('sr-RS')}\n`);
  
  const test1 = await testTCPConnection();
  console.log('');
  
  const test2 = await testHTTPConnection();
  console.log('');
  
  const test3 = await testSMSGatewayEndpoint();
  console.log('');
  
  const test4 = await testNetworkInfo();
  console.log('');
  
  console.log('📊 REZULTATI TESTOVA:');
  console.log(`TCP Socket: ${test1 ? '✅ RADI' : '❌ NE RADI'}`);
  console.log(`HTTP GET: ${test2 ? '✅ RADI' : '❌ NE RADI'}`);
  console.log(`SMS Gateway: ${test3 ? '✅ RADI' : '❌ NE RADI'}`);
  console.log(`Mrežne info: ${test4 ? '✅ RADI' : '❌ NE RADI'}`);
  
  if (!test1 && !test2 && !test3) {
    console.log('\n🚨 DIJAGNOZA: iPhone SMS Gateway aplikacija NIJE pokrenuta!');
    console.log('   Potrebno je kliknuti "Start Server" dugme u aplikaciji.');
  } else if (test1 && !test3) {
    console.log('\n🔧 DIJAGNOZA: Server radi ali SMS parametri nisu ispravni');
  } else if (test1 && test2 && test3) {
    console.log('\n🎉 DIJAGNOZA: SMS Gateway potpuno funkcionalan!');
  }
}

runAllTests().catch(console.error);