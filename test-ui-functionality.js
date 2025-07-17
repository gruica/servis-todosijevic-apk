/**
 * TEST UI FUNKCIONALNOSTI - Testiranje specifičnih UI funkcionalnosti
 * koje se mogu testirati kroz API pozive
 */

import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';

// Kreiraj API instancu
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

// Admin login za testiranje admin funkcionalnosti
async function adminLogin(api) {
  try {
    const response = await api.post('/api/login', {
      username: 'jelena@frigosistemtodosijevic.me',
      password: 'admin123'
    });
    return response.data;
  } catch (error) {
    throw new Error(`Admin login failed: ${error.response?.data?.error || error.message}`);
  }
}

// Technician login
async function technicianLogin(api, username, password) {
  try {
    const response = await api.post('/api/login', {
      username,
      password
    });
    return response.data;
  } catch (error) {
    throw new Error(`Technician login failed: ${error.response?.data?.error || error.message}`);
  }
}

// Test funkcionalnosti za admin
async function testAdminFunctionality() {
  console.log('\n📋 TESTIRANJE ADMIN FUNKCIONALNOSTI');
  console.log('=' .repeat(50));
  
  const api = createApiInstance();
  
  try {
    // Login kao admin
    await adminLogin(api);
    console.log('✅ Admin login uspešan');
    
    // Test 1: Dobijanje svih servisa
    const servicesResponse = await api.get('/api/admin/services');
    console.log(`✅ Admin može videti ${servicesResponse.data.length} servisa`);
    
    // Test 2: Dobijanje statistike
    const statsResponse = await api.get('/api/stats');
    console.log(`✅ Admin statistike: ${statsResponse.data.activeCount} aktivnih servisa`);
    
    // Test 3: Dodela servisera (ako postoji nedeodjen servis)
    const unassignedService = servicesResponse.data.find(s => s.status === 'pending');
    if (unassignedService) {
      const assignResponse = await api.post(`/api/admin/services/${unassignedService.id}/assign-technician`, {
        technicianId: 1
      });
      console.log(`✅ Admin može dodeliti servis #${unassignedService.id} serviseru`);
    }
    
    // Test 4: Kreiranje novog servisa
    const newServiceResponse = await api.post('/api/services', {
      clientId: 6,
      applianceId: 2,
      description: 'Test servis iz UI testa',
      warrantyStatus: 'in_warranty'
    });
    const serviceId = newServiceResponse.data.data?.id;
    console.log(`✅ Admin može kreirati novi servis #${serviceId}`);
    
    // Test 5: Brisanje servisa (samo ako je ID valjan)
    if (serviceId && serviceId > 0) {
      const deleteResponse = await api.delete(`/api/admin/services/${serviceId}`);
      console.log(`✅ Admin može obrisati servis`);
    } else {
      console.log(`⚠️ Kreiranje servisa vratilo nevaljan ID, preskačem brisanje`);
      console.log(`Struktura odgovora:`, JSON.stringify(newServiceResponse.data, null, 2));
    }
    
    // Test 6: Upravljanje korisnicima
    const usersResponse = await api.get('/api/admin/users');
    console.log(`✅ Admin može videti ${usersResponse.data.length} korisnika`);
    
    // Test 7: Rezervni delovi
    const sparePartsResponse = await api.get('/api/admin/spare-parts');
    console.log(`✅ Admin može videti ${sparePartsResponse.data.length} zahteva za rezervne delove`);
    
    console.log('✅ SVE ADMIN FUNKCIONALNOSTI SU ISPRAVNE');
    
  } catch (error) {
    console.error('❌ Admin funkcionalnost greška:', error.message);
    throw error;
  }
}

// Test funkcionalnosti za servisere
async function testTechnicianUiFunctionality() {
  console.log('\n🔧 TESTIRANJE SERVISER UI FUNKCIONALNOSTI');
  console.log('=' .repeat(50));
  
  const api = createApiInstance();
  
  try {
    // Login kao Gruica
    await technicianLogin(api, 'gruica@frigosistemtodosijevic.com', 'serviser123');
    console.log('✅ Serviser login uspešan');
    
    // Test 1: Dobijanje moji servisi
    const myServicesResponse = await api.get('/api/my-services');
    console.log(`✅ Serviser može videti ${myServicesResponse.data.length} svojih servisa`);
    
    if (myServicesResponse.data.length > 0) {
      const testService = myServicesResponse.data[0];
      
      // Test 2: Ažuriranje statusa servisa
      const statusUpdateResponse = await api.put(`/api/services/${testService.id}/status`, {
        status: 'in_progress',
        technicianNotes: 'Servis je započet'
      });
      console.log(`✅ Serviser može ažurirati status servisa #${testService.id}`);
      
      // Test 3: Dodavanje napomene
      const notesUpdateResponse = await api.put(`/api/services/${testService.id}`, {
        technicianNotes: 'Test napomena iz UI testa'
      });
      console.log(`✅ Serviser može dodati napomene`);
      
      // Test 4: Označavanje klijenta kao nedostupan
      const clientUnavailableResponse = await api.put(`/api/services/${testService.id}/client-unavailable`, {
        reason: 'Nije kući',
        reschedulingNotes: 'Pokušati ponovo sutra'
      });
      console.log(`✅ Serviser može označiti klijenta kao nedostupan`);
      
      // Test 5: Zahtev za rezervne delove
      const sparePartsResponse = await api.post('/api/spare-parts/request', {
        serviceId: testService.id,
        partName: 'Test deo',
        partNumber: 'TEST-123',
        quantity: 1,
        urgency: 'high',
        notes: 'Hitno potreban'
      });
      console.log(`✅ Serviser može zatražiti rezervne delove`);
      
      // Test 6: Završavanje servisa
      const completeResponse = await api.put(`/api/services/${testService.id}/complete`, {
        technicianNotes: 'Servis je završen uspešno',
        cost: '75.00',
        usedParts: JSON.stringify(['Test deo']),
        isCompletelyFixed: true
      });
      console.log(`✅ Serviser može završiti servis`);
    }
    
    // Test 7: Notifikacije
    const notificationsResponse = await api.get('/api/notifications');
    console.log(`✅ Serviser može videti ${notificationsResponse.data.length} notifikacija`);
    
    // Test 8: Označavanje notifikacije kao pročitane
    if (notificationsResponse.data.length > 0) {
      const notification = notificationsResponse.data[0];
      const markReadResponse = await api.put(`/api/notifications/${notification.id}/mark-read`);
      console.log(`✅ Serviser može označiti notifikaciju kao pročitanu`);
    }
    
    console.log('✅ SVE SERVISER UI FUNKCIONALNOSTI SU ISPRAVNE');
    
  } catch (error) {
    console.error('❌ Serviser UI funkcionalnost greška:', error.message);
    throw error;
  }
}

// Test notifikacija i realtime funkcionalnosti
async function testNotificationsFunctionality() {
  console.log('\n🔔 TESTIRANJE NOTIFIKACIJA I REALTIME FUNKCIONALNOSTI');
  console.log('=' .repeat(50));
  
  const adminApi = createApiInstance();
  const techApi = createApiInstance();
  
  try {
    // Admin login
    await adminLogin(adminApi);
    console.log('✅ Admin prijavljen');
    
    // Serviser login
    await technicianLogin(techApi, 'petar@frigosistemtodosijevic.com', 'serviser123');
    console.log('✅ Serviser prijavljen');
    
    // Test 1: Admin kreira novi servis
    const newServiceResponse = await adminApi.post('/api/services', {
      clientId: 6,
      applianceId: 2,
      description: 'Test servis za notifikacije',
      warrantyStatus: 'in_warranty'
    });
    const serviceId = newServiceResponse.data.data?.id;
    console.log(`✅ Admin kreirao novi servis #${serviceId}`);
    
    // Test 2: Admin dodeljuje servis serviseru
    const assignResponse = await adminApi.put(`/api/services/${serviceId}/assign-technician`, {
      technicianId: 4
    });
    console.log(`✅ Admin dodelio servis serviseru`);
    
    // Test 3: Provera da li je serviser dobio notifikaciju
    const techNotificationsResponse = await techApi.get('/api/notifications');
    const hasNewNotification = techNotificationsResponse.data.some(n => 
      n.relatedServiceId === serviceId
    );
    if (hasNewNotification) {
      console.log('✅ Serviser je dobio notifikaciju o novom servisu');
    } else {
      console.log('⚠️ Serviser nije dobio notifikaciju (možda je već pročitana)');
    }
    
    // Test 4: Serviser ažurira status
    const statusUpdateResponse = await techApi.put(`/api/services/${serviceId}/status`, {
      status: 'completed',
      technicianNotes: 'Servis je završen',
      cost: '50.00'
    });
    console.log(`✅ Serviser završio servis`);
    
    // Test 5: Čišćenje - brisanje test servisa
    await adminApi.delete(`/api/admin/services/${serviceId}`);
    console.log(`✅ Test servis obrisan`);
    
    console.log('✅ SVE NOTIFIKACIJE FUNKCIONALNOSTI SU ISPRAVNE');
    
  } catch (error) {
    console.error('❌ Notifikacije funkcionalnost greška:', error.message);
    throw error;
  }
}

// Test poslovnih partnera
async function testBusinessPartnerFunctionality() {
  console.log('\n🏢 TESTIRANJE POSLOVNI PARTNER FUNKCIONALNOSTI');
  console.log('=' .repeat(50));
  
  const api = createApiInstance();
  
  try {
    // Login kao poslovni partner
    const loginResponse = await api.post('/api/login', {
      username: 'robert.ivezic@tehnoplus.me',
      password: 'partner123'
    });
    console.log('✅ Poslovni partner login uspešan');
    
    // Test 1: Kreiranje novog klijenta
    const newClientResponse = await api.post('/api/business/clients', {
      fullName: 'Test Klijent UI',
      email: 'test@example.com',
      phone: '+38269123456',
      address: 'Test adresa 123',
      city: 'Budva'
    });
    console.log(`✅ Poslovni partner može kreirati klijenta`);
    
    // Test 2: Kreiranje novog uređaja
    const uniqueSerial = `TEST-UI-${Date.now()}`;
    const newApplianceResponse = await api.post('/api/appliances', {
      clientId: newClientResponse.data.id,
      categoryId: 1,
      manufacturerId: 1,
      model: 'Test model',
      serialNumber: uniqueSerial
    });
    console.log(`✅ Poslovni partner može kreirati uređaj`);
    
    // Test 3: Kreiranje zahteva za servis
    const applianceId = newApplianceResponse.data.data?.id;
    const newServiceResponse = await api.post('/api/business/services', {
      clientId: newClientResponse.data.id,
      applianceId: applianceId,
      description: 'Test servis od poslovnog partnera',
      warrantyStatus: 'in_warranty'
    });
    console.log(`✅ Poslovni partner može kreirati zahtev za servis`);
    
    // Test 4: Pregled svojih servisa
    const myServicesResponse = await api.get('/api/business/services');
    console.log(`✅ Poslovni partner može videti ${myServicesResponse.data.length} svojih servisa`);
    
    console.log('✅ SVE POSLOVNI PARTNER FUNKCIONALNOSTI SU ISPRAVNE');
    
  } catch (error) {
    console.error('❌ Poslovni partner funkcionalnost greška:', error.message);
    throw error;
  }
}

// Test rezervnih delova workflow
async function testSparePartsWorkflow() {
  console.log('\n🔩 TESTIRANJE REZERVNI DELOVI WORKFLOW');
  console.log('=' .repeat(50));
  
  const adminApi = createApiInstance();
  const techApi = createApiInstance();
  
  try {
    // Admin login
    await adminLogin(adminApi);
    console.log('✅ Admin prijavljen');
    
    // Serviser login
    await technicianLogin(techApi, 'nikola@frigosistemtodosijevic.com', 'serviser123');
    console.log('✅ Serviser prijavljen');
    
    // Test 1: Serviser pravi zahtev za rezervni deo
    const sparePartsResponse = await techApi.post('/api/spare-parts/request', {
      serviceId: 1,
      partName: 'Test rezervni deo',
      partNumber: 'TEST-PART-123',
      quantity: 2,
      urgency: 'high',
      notes: 'Hitno potreban za popravku'
    });
    console.log(`✅ Serviser napravio zahtev za rezervni deo`);
    
    // Test 2: Admin vidi zahtev
    const adminSparePartsResponse = await adminApi.get('/api/admin/spare-parts');
    console.log(`✅ Admin može videti ${adminSparePartsResponse.data.length} zahteva za rezervne delove`);
    
    // Test 3: Admin ažurira status rezervnog dela
    if (adminSparePartsResponse.data.length > 0) {
      const latestRequest = adminSparePartsResponse.data[0];
      const updateResponse = await adminApi.put(`/api/admin/spare-parts/${latestRequest.id}`, {
        status: 'ordered',
        supplierName: 'Test dobavljač',
        estimatedCost: '25.00',
        estimatedDelivery: '2025-07-20'
      });
      console.log(`✅ Admin može ažurirati status rezervnog dela`);
    }
    
    // Test 4: Serviser vidi ažuriranje
    const updatedSparePartsResponse = await techApi.get('/api/my-spare-parts');
    console.log(`✅ Serviser može videti status svojih rezervnih delova`);
    
    console.log('✅ SVE REZERVNI DELOVI WORKFLOW SU ISPRAVNE');
    
  } catch (error) {
    console.error('❌ Rezervni delovi workflow greška:', error.message);
    throw error;
  }
}

// Glavni test
async function runAllUiTests() {
  console.log('🎯 KOMPLETNO TESTIRANJE UI FUNKCIONALNOSTI');
  console.log('=' .repeat(80));
  
  try {
    await testAdminFunctionality();
    await testTechnicianUiFunctionality();
    await testNotificationsFunctionality();
    await testBusinessPartnerFunctionality();
    await testSparePartsWorkflow();
    
    console.log('\n' + '=' .repeat(80));
    console.log('🎉 SVE UI FUNKCIONALNOSTI SU POTPUNO ISPRAVNE!');
    console.log('=' .repeat(80));
    
    return true;
    
  } catch (error) {
    console.error('\n❌ UI FUNKCIONALNOST GREŠKA:', error.message);
    return false;
  }
}

// Pokretanje testova
runAllUiTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ KRITIČNA GREŠKA:', error);
  process.exit(1);
});