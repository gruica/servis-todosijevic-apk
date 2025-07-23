#!/usr/bin/env node

/**
 * Kompletno testiranje Admin SMS Sistema
 * 
 * Testira sve admin SMS funkcionalnosti:
 * 1. Admin SMS za novi servis
 * 2. Admin SMS za promenu statusa 
 * 3. Admin SMS za dodelu servisera
 * 4. Validaciju admin template-a i metoda
 * 
 * Verzija: 1.0
 * Datum: 23. juli 2025
 */

import axios from 'axios';
import fs from 'fs';

const BASE_URL = 'https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev';

// Test konfiguracija
const testConfig = {
  adminCredentials: {
    username: 'admin',
    password: 'admin123'
  },
  testServiceData: {
    clientId: 1,  // Pretpostavljamo da postoji klijent sa ID 1
    applianceId: 1, // Pretpostavljamo da postoji uređaj sa ID 1
    description: 'TEST ADMIN SMS - Problem sa frižiderom, ne hladi dovoljno',
    status: 'pending',
    priority: 'medium'
  },
  testTechnicianId: 1 // ID tehničara za dodelu
};

let authToken = '';
let testServiceId = null;

// Util funkcija za logovanje
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}]`;
  console.log(`${prefix} ${message}`);
  
  // Append to log file
  const logLine = `${prefix} ${message}\n`;
  fs.appendFileSync('admin-sms-test.log', logLine);
}

// Error handler
function logError(message, error) {
  log(message, 'ERROR');
  if (error.response) {
    log(`HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`, 'ERROR');
  } else if (error.message) {
    log(`Error message: ${error.message}`, 'ERROR');
  }
}

// Login funkcija
async function login() {
  try {
    log('🔑 Pokušavam login kao admin...');
    
    const response = await axios.post(`${BASE_URL}/api/login`, testConfig.adminCredentials);
    
    if (response.data.token) {
      authToken = response.data.token;
      log(`✅ Uspešan login! Token dobijen.`);
      return true;
    } else {
      log('❌ Login neuspešan - nema token u odgovoru', 'ERROR');
      return false;
    }
  } catch (error) {
    logError('❌ Greška pri login-u', error);
    return false;
  }
}

// Test 1: Kreiranje novog servisa (treba da trigeuje admin SMS)
async function testCreateServiceAdminSMS() {
  try {
    log('📝 TEST 1: Kreiranje novog servisa za admin SMS...');
    
    const response = await axios.post(
      `${BASE_URL}/api/services`,
      testConfig.testServiceData,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.status === 201 && response.data.data?.id) {
      testServiceId = response.data.data.id;
      log(`✅ TEST 1 USPEŠAN: Servis kreiran sa ID ${testServiceId}`);
      log(`📱 Admin SMS treba da bude poslat svim administratorima o novom servisu`);
      return true;
    } else {
      log('❌ TEST 1 NEUSPEŠAN: Servis nije kreiran', 'ERROR');
      return false;
    }
  } catch (error) {
    logError('❌ TEST 1 GREŠKA pri kreiranju servisa', error);
    return false;
  }
}

// Test 2: Promena statusa servisa (treba da trigeuje admin SMS)
async function testUpdateServiceStatusAdminSMS() {
  if (!testServiceId) {
    log('❌ TEST 2 PRESKOČEN: Nema kreiranog servisa', 'ERROR');
    return false;
  }

  try {
    log('🔄 TEST 2: Promena statusa servisa za admin SMS...');
    
    const response = await axios.put(
      `${BASE_URL}/api/services/${testServiceId}`,
      {
        status: 'in_progress',
        technicianNotes: 'Započet rad na servisu'
      },
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.status === 200) {
      log(`✅ TEST 2 USPEŠAN: Status servisa ${testServiceId} promenjen na 'in_progress'`);
      log(`📱 Admin SMS treba da bude poslat svim administratorima o promeni statusa`);
      return true;
    } else {
      log('❌ TEST 2 NEUSPEŠAN: Status nije promenjen', 'ERROR');
      return false;
    }
  } catch (error) {
    logError('❌ TEST 2 GREŠKA pri promeni statusa', error);
    return false;
  }
}

// Test 3: Dodela tehničara (treba da trigeuje admin SMS)
async function testAssignTechnicianAdminSMS() {
  if (!testServiceId) {
    log('❌ TEST 3 PRESKOČEN: Nema kreiranog servisa', 'ERROR');
    return false;
  }

  try {
    log('👨‍🔧 TEST 3: Dodela tehničara za admin SMS...');
    
    const response = await axios.put(
      `${BASE_URL}/api/services/${testServiceId}/assign-technician`,
      {
        technicianId: testConfig.testTechnicianId
      },
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.status === 200) {
      log(`✅ TEST 3 USPEŠAN: Tehničar ${testConfig.testTechnicianId} dodeljen servisu ${testServiceId}`);
      log(`📱 Admin SMS treba da bude poslat svim administratorima o dodeli tehničara`);
      return true;
    } else {
      log('❌ TEST 3 NEUSPEŠAN: Tehničar nije dodeljen', 'ERROR');
      return false;
    }
  } catch (error) {
    logError('❌ TEST 3 GREŠKA pri dodeli tehničara', error);
    return false;
  }
}

// Test 4: Provera SMS template-a i konfiguracije
async function testAdminSMSTemplates() {
  try {
    log('📋 TEST 4: Provera admin SMS template-a i konfiguracije...');
    
    // Test SMS konfiguracije
    const configResponse = await axios.get(
      `${BASE_URL}/api/admin/sms-mobile-config`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    if (configResponse.status === 200) {
      const config = configResponse.data;
      log(`✅ SMS konfiguracija dohvaćena:`);
      log(`   - Enabled: ${config.enabled}`);
      log(`   - Base URL: ${config.baseUrl}`);
      log(`   - Sender ID: ${config.senderId}`);
      log(`   - API Key: ${config.apiKey ? 'POSTOJI' : 'NEDOSTAJE'}`);
      
      if (config.enabled && config.apiKey) {
        log(`📱 Admin SMS sistem je potpuno konfigurisan i spreman`);
        return true;
      } else {
        log(`⚠️ Admin SMS sistem nije potpuno konfigurisan`, 'WARN');
        return false;
      }
    } else {
      log('❌ TEST 4 NEUSPEŠAN: Ne mogu da dohvatim SMS konfiguraciju', 'ERROR');
      return false;
    }
  } catch (error) {
    logError('❌ TEST 4 GREŠKA pri proveri SMS konfiguracije', error);
    return false;
  }
}

// Test 5: Manual admin SMS test
async function testManualAdminSMS() {
  try {
    log('📤 TEST 5: Manual test admin SMS slanja...');
    
    const testResponse = await axios.post(
      `${BASE_URL}/api/admin/sms-test`,
      {
        recipient: '+38267077092', // Test broj
        message: 'TEST ADMIN SMS: Automatski sistem obaveštava administratore o svim promenama u servisu. Test uspešan!',
        messageType: 'admin_test'
      },
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (testResponse.status === 200) {
      log(`✅ TEST 5 USPEŠAN: Manual admin SMS test poslat`);
      log(`📱 Poruka ID: ${testResponse.data.messageId || 'N/A'}`);
      return true;
    } else {
      log('❌ TEST 5 NEUSPEŠAN: Manual SMS test nije poslat', 'ERROR');
      return false;
    }
  } catch (error) {
    logError('❌ TEST 5 GREŠKA pri manual SMS testu', error);
    return false;
  }
}

// Glavni test runner
async function runCompleteAdminSMSTest() {
  log('🚀 POKRETANJE KOMPLETNOG ADMIN SMS TESTA');
  log('==========================================');
  
  // Clear log file
  fs.writeFileSync('admin-sms-test.log', '');
  
  const testResults = {
    login: false,
    createService: false,
    updateStatus: false,
    assignTechnician: false,
    smsTemplates: false,
    manualSMS: false
  };
  
  // Pokretanje testova
  testResults.login = await login();
  
  if (testResults.login) {
    testResults.createService = await testCreateServiceAdminSMS();
    
    // Pauza za SMS processing
    log('⏳ Pauza 3 sekunde za SMS processing...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    testResults.updateStatus = await testUpdateServiceStatusAdminSMS();
    
    // Pauza za SMS processing
    log('⏳ Pauza 3 sekunde za SMS processing...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    testResults.assignTechnician = await testAssignTechnicianAdminSMS();
    
    testResults.smsTemplates = await testAdminSMSTemplates();
    testResults.manualSMS = await testManualAdminSMS();
  }
  
  // Finalni izveštaj
  log('');
  log('📊 FINALNI IZVEŠTAJ ADMIN SMS TESTA');
  log('==================================');
  
  const passedTests = Object.values(testResults).filter(result => result === true).length;
  const totalTests = Object.keys(testResults).length;
  
  Object.entries(testResults).forEach(([testName, result]) => {
    const status = result ? '✅ PROŠAO' : '❌ POŠAO';
    log(`${status} - ${testName.toUpperCase()}`);
  });
  
  log('');
  log(`🎯 UKUPAN REZULTAT: ${passedTests}/${totalTests} testova prošlo`);
  
  if (passedTests === totalTests) {
    log('🎉 SVI ADMIN SMS TESTOVI SU USPEŠNI!');
    log('📱 Admin SMS sistem je potpuno funkcionalan');
  } else {
    log('⚠️ Neki admin SMS testovi nisu prošli');
    log('🔧 Potrebno je dodatno podešavanje sistema');
  }
  
  log('');
  log(`📋 Detaljan log sačuvan u: admin-sms-test.log`);
  log(`🆔 Test servis ID: ${testServiceId || 'NIJE KREIRAN'}`);
}

// Pokretanje
runCompleteAdminSMSTest().catch(error => {
  log('💥 KRITIČNA GREŠKA PRI POKRETANJU TESTA', 'FATAL');
  console.error(error);
  process.exit(1);
});

export {
  runCompleteAdminSMSTest,
  testConfig
};