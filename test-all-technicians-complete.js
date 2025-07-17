/**
 * KOMPLETNI TEST SVIH SERVISERA - SVE FUNKCIONALNOSTI
 * Testira sve servisere i sve njihove funkcionalnosti detaljno
 */

import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';

// Lista svih servisera
const TECHNICIANS = [
  {
    id: 1,
    username: 'petar@frigosistemtodosijevic.com',
    password: 'serviser123',
    name: 'Petar Todosijević',
    technicianId: 1
  },
  {
    id: 2,
    username: 'jovan@frigosistemtodosijevic.com',
    password: 'serviser123',
    name: 'Jovan Todosijević',
    technicianId: 3
  },
  {
    id: 3,
    username: 'nikola@frigosistemtodosijevic.com',
    password: 'serviser123',
    name: 'Nikola Todosijević',
    technicianId: 4
  },
  {
    id: 4,
    username: 'gruica@frigosistemtodosijevic.com',
    password: 'serviser123',
    name: 'Gruica Todosijević',
    technicianId: 2
  }
];

// Funkcije za testiranje
const FUNCTIONALITY_TESTS = [
  'login',
  'getUserData',
  'getMyServices',
  'getNotifications',
  'updateService',
  'updateServiceStatus',
  'getCategories',
  'getManufacturers',
  'getClients',
  'getAppliances',
  'testServiceAssignment',
  'testServiceCompletion',
  'testSparePartsRequest',
  'logout'
];

// Kreiraj API instancu sa cookie supportom
function createApiInstance() {
  const jar = new CookieJar();
  return wrapper(axios.create({
    baseURL: 'http://localhost:5000',
    withCredentials: true,
    timeout: 15000,
    jar,
    headers: {
      'Content-Type': 'application/json'
    }
  }));
}

// Test funkcije
async function testLogin(api, technician) {
  try {
    const response = await api.post('/api/login', {
      username: technician.username,
      password: technician.password
    });
    
    if (response.data.id && response.data.role === 'technician') {
      return { success: true, data: response.data };
    }
    return { success: false, error: 'Invalid login response' };
  } catch (error) {
    return { success: false, error: error.response?.data?.error || error.message };
  }
}

async function testGetUserData(api) {
  try {
    const response = await api.get('/api/user');
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.response?.data?.error || error.message };
  }
}

async function testGetMyServices(api) {
  try {
    const response = await api.get('/api/my-services');
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.response?.data?.error || error.message };
  }
}

async function testGetNotifications(api) {
  try {
    const response = await api.get('/api/notifications');
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.response?.data?.error || error.message };
  }
}

async function testUpdateService(api, serviceId) {
  try {
    const response = await api.put(`/api/services/${serviceId}`, {
      technicianNotes: `Test napomena - ${new Date().toISOString()}`
    });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.response?.data?.error || error.message };
  }
}

async function testUpdateServiceStatus(api, serviceId) {
  try {
    const response = await api.put(`/api/services/${serviceId}/status`, {
      status: 'in_progress',
      technicianNotes: 'Servis je u toku'
    });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.response?.data?.error || error.message };
  }
}

async function testGetCategories(api) {
  try {
    const response = await api.get('/api/appliance-categories');
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.response?.data?.error || error.message };
  }
}

async function testGetManufacturers(api) {
  try {
    const response = await api.get('/api/manufacturers');
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.response?.data?.error || error.message };
  }
}

async function testGetClients(api) {
  try {
    const response = await api.get('/api/clients');
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.response?.data?.error || error.message };
  }
}

async function testGetAppliances(api) {
  try {
    const response = await api.get('/api/appliances');
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.response?.data?.error || error.message };
  }
}

async function testServiceAssignment(api, serviceId, technicianId) {
  try {
    const response = await api.post(`/api/services/${serviceId}/assign-technician`, {
      technicianId: technicianId
    });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.response?.data?.error || error.message };
  }
}

async function testServiceCompletion(api, serviceId) {
  try {
    const response = await api.put(`/api/services/${serviceId}/complete`, {
      technicianNotes: 'Servis je završen uspešno',
      cost: '50.00',
      usedParts: JSON.stringify(['Test deo']),
      isCompletelyFixed: true
    });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.response?.data?.error || error.message };
  }
}

async function testSparePartsRequest(api, serviceId) {
  try {
    const response = await api.post('/api/spare-parts/request', {
      serviceId: serviceId,
      partName: 'Test rezervni deo',
      partNumber: 'TEST-123',
      quantity: 1,
      urgency: 'medium',
      notes: 'Test zahtev za rezervni deo'
    });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.response?.data?.error || error.message };
  }
}

async function testLogout(api) {
  try {
    const response = await api.post('/api/logout');
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.response?.data?.error || error.message };
  }
}

// Glavni test za jednog servisera
async function testTechnician(technician) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧑‍🔧 TESTIRANJE SERVISERA: ${technician.name}`);
  console.log(`📧 Email: ${technician.username}`);
  console.log(`🆔 Technician ID: ${technician.technicianId}`);
  console.log(`${'='.repeat(60)}`);
  
  const api = createApiInstance();
  const results = {
    technician: technician.name,
    passed: 0,
    failed: 0,
    tests: {}
  };
  
  let userData = null;
  let services = [];
  
  // Test 1: Login
  console.log('\n1. 🔐 TEST LOGIN...');
  const loginResult = await testLogin(api, technician);
  results.tests.login = loginResult;
  if (loginResult.success) {
    console.log('✅ Login uspešan');
    userData = loginResult.data;
    results.passed++;
  } else {
    console.log('❌ Login neuspešan:', loginResult.error);
    results.failed++;
    return results; // Prekini test ako login ne radi
  }
  
  // Test 2: Get User Data
  console.log('\n2. 👤 TEST KORISNIČKIH PODATAKA...');
  const userDataResult = await testGetUserData(api);
  results.tests.getUserData = userDataResult;
  if (userDataResult.success) {
    console.log('✅ Korisnički podaci dobijeni');
    console.log(`   - ID: ${userDataResult.data.id}`);
    console.log(`   - Role: ${userDataResult.data.role}`);
    console.log(`   - Technician ID: ${userDataResult.data.technicianId}`);
    results.passed++;
  } else {
    console.log('❌ Greška pri dobijanju korisničkih podataka:', userDataResult.error);
    results.failed++;
  }
  
  // Test 3: Get My Services
  console.log('\n3. 📋 TEST DOBIJANJA SERVISA...');
  const servicesResult = await testGetMyServices(api);
  results.tests.getMyServices = servicesResult;
  if (servicesResult.success) {
    console.log(`✅ Servisi dobijeni: ${servicesResult.data.length} servisa`);
    services = servicesResult.data;
    services.forEach((service, index) => {
      console.log(`   ${index + 1}. Servis #${service.id} - ${service.status}`);
      console.log(`      Klijent: ${service.client?.fullName || 'N/A'}`);
      console.log(`      Uređaj: ${service.appliance?.category?.name || 'N/A'}`);
    });
    results.passed++;
  } else {
    console.log('❌ Greška pri dobijanju servisa:', servicesResult.error);
    results.failed++;
  }
  
  // Test 4: Get Notifications
  console.log('\n4. 🔔 TEST NOTIFIKACIJA...');
  const notificationsResult = await testGetNotifications(api);
  results.tests.getNotifications = notificationsResult;
  if (notificationsResult.success) {
    console.log(`✅ Notifikacije dobijene: ${notificationsResult.data.length} notifikacija`);
    results.passed++;
  } else {
    console.log('❌ Greška pri dobijanju notifikacija:', notificationsResult.error);
    results.failed++;
  }
  
  // Test 5: Update Service (ako postoji servis)
  if (services.length > 0) {
    console.log('\n5. 🔧 TEST AŽURIRANJA SERVISA...');
    const updateResult = await testUpdateService(api, services[0].id);
    results.tests.updateService = updateResult;
    if (updateResult.success) {
      console.log('✅ Servis uspešno ažuriran');
      results.passed++;
    } else {
      console.log('❌ Greška pri ažuriranju servisa:', updateResult.error);
      results.failed++;
    }
    
    // Test 6: Update Service Status
    console.log('\n6. 🔄 TEST PROMENE STATUSA SERVISA...');
    const statusResult = await testUpdateServiceStatus(api, services[0].id);
    results.tests.updateServiceStatus = statusResult;
    if (statusResult.success) {
      console.log('✅ Status servisa uspešno promenjen');
      results.passed++;
    } else {
      console.log('❌ Greška pri promeni statusa servisa:', statusResult.error);
      results.failed++;
    }
  } else {
    console.log('\n5-6. ⚠️ Nema servisa za testiranje ažuriranja');
    results.tests.updateService = { success: false, error: 'No services to test' };
    results.tests.updateServiceStatus = { success: false, error: 'No services to test' };
    results.failed += 2;
  }
  
  // Test 7: Get Categories
  console.log('\n7. 📦 TEST DOBIJANJA KATEGORIJA...');
  const categoriesResult = await testGetCategories(api);
  results.tests.getCategories = categoriesResult;
  if (categoriesResult.success) {
    console.log(`✅ Kategorije dobijene: ${categoriesResult.data.length} kategorija`);
    results.passed++;
  } else {
    console.log('❌ Greška pri dobijanju kategorija:', categoriesResult.error);
    results.failed++;
  }
  
  // Test 8: Get Manufacturers
  console.log('\n8. 🏭 TEST DOBIJANJA PROIZVOĐAČA...');
  const manufacturersResult = await testGetManufacturers(api);
  results.tests.getManufacturers = manufacturersResult;
  if (manufacturersResult.success) {
    console.log(`✅ Proizvođači dobijeni: ${manufacturersResult.data.length} proizvođača`);
    results.passed++;
  } else {
    console.log('❌ Greška pri dobijanju proizvođača:', manufacturersResult.error);
    results.failed++;
  }
  
  // Test 9: Get Clients
  console.log('\n9. 👥 TEST DOBIJANJA KLIJENATA...');
  const clientsResult = await testGetClients(api);
  results.tests.getClients = clientsResult;
  if (clientsResult.success) {
    console.log(`✅ Klijenti dobijeni: ${clientsResult.data.length} klijenata`);
    results.passed++;
  } else {
    console.log('❌ Greška pri dobijanju klijenata:', clientsResult.error);
    results.failed++;
  }
  
  // Test 10: Get Appliances
  console.log('\n10. 🔧 TEST DOBIJANJA UREĐAJA...');
  const appliancesResult = await testGetAppliances(api);
  results.tests.getAppliances = appliancesResult;
  if (appliancesResult.success) {
    console.log(`✅ Uređaji dobijeni: ${appliancesResult.data.length} uređaja`);
    results.passed++;
  } else {
    console.log('❌ Greška pri dobijanju uređaja:', appliancesResult.error);
    results.failed++;
  }
  
  // Test 11: Spare Parts Request (ako postoji servis)
  if (services.length > 0) {
    console.log('\n11. 🔩 TEST ZAHTEVA ZA REZERVNE DELOVE...');
    const sparePartsResult = await testSparePartsRequest(api, services[0].id);
    results.tests.testSparePartsRequest = sparePartsResult;
    if (sparePartsResult.success) {
      console.log('✅ Zahtev za rezervne delove uspešno poslat');
      results.passed++;
    } else {
      console.log('❌ Greška pri zahtevu za rezervne delove:', sparePartsResult.error);
      results.failed++;
    }
  } else {
    console.log('\n11. ⚠️ Nema servisa za testiranje zahteva za rezervne delove');
    results.tests.testSparePartsRequest = { success: false, error: 'No services to test' };
    results.failed++;
  }
  
  // Test 12: Logout
  console.log('\n12. 🚪 TEST LOGOUT...');
  const logoutResult = await testLogout(api);
  results.tests.logout = logoutResult;
  if (logoutResult.success) {
    console.log('✅ Logout uspešan');
    results.passed++;
  } else {
    console.log('❌ Greška pri logout-u:', logoutResult.error);
    results.failed++;
  }
  
  // Rezultat za servisera
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 REZULTAT ZA ${technician.name}:`);
  console.log(`✅ Uspešno: ${results.passed} testova`);
  console.log(`❌ Neuspešno: ${results.failed} testova`);
  console.log(`📈 Procenat uspešnosti: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);
  console.log(`${'='.repeat(60)}`);
  
  return results;
}

// Glavni test za sve servisere
async function testAllTechnicians() {
  console.log('🎯 KOMPLETAN TEST SVIH SERVISERA - SVE FUNKCIONALNOSTI');
  console.log('=' .repeat(80));
  
  const allResults = [];
  
  for (const technician of TECHNICIANS) {
    const result = await testTechnician(technician);
    allResults.push(result);
    
    // Kratka pauza između testova
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Finalni izveštaj
  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 FINALNI IZVEŠTAJ - SVI SERVISERI');
  console.log('=' .repeat(80));
  
  let totalPassed = 0;
  let totalFailed = 0;
  
  allResults.forEach(result => {
    console.log(`\n🧑‍🔧 ${result.technician}:`);
    console.log(`   ✅ Uspešno: ${result.passed}`);
    console.log(`   ❌ Neuspešno: ${result.failed}`);
    console.log(`   📈 Procenat: ${Math.round((result.passed / (result.passed + result.failed)) * 100)}%`);
    
    totalPassed += result.passed;
    totalFailed += result.failed;
  });
  
  console.log(`\n${'='.repeat(80)}`);
  console.log('🎯 UKUPNI REZULTAT:');
  console.log(`✅ Ukupno uspešno: ${totalPassed} testova`);
  console.log(`❌ Ukupno neuspešno: ${totalFailed} testova`);
  console.log(`📈 Ukupni procenat uspešnosti: ${Math.round((totalPassed / (totalPassed + totalFailed)) * 100)}%`);
  
  if (totalFailed > 0) {
    console.log('\n❌ DETALJNI IZVEŠTAJ GREŠAKA:');
    console.log('=' .repeat(80));
    
    allResults.forEach(result => {
      const failedTests = Object.entries(result.tests).filter(([, test]) => !test.success);
      if (failedTests.length > 0) {
        console.log(`\n🧑‍🔧 ${result.technician} - GREŠKE:`);
        failedTests.forEach(([testName, test]) => {
          console.log(`   ❌ ${testName}: ${test.error}`);
        });
      }
    });
  }
  
  console.log('=' .repeat(80));
  
  return allResults;
}

// Pokretanje kompletnog testa
testAllTechnicians().then(results => {
  const totalFailed = results.reduce((sum, result) => sum + result.failed, 0);
  process.exit(totalFailed > 0 ? 1 : 0);
}).catch(error => {
  console.error('❌ KRITIČNA GREŠKA:', error);
  process.exit(1);
});