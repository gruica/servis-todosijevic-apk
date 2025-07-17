/**
 * Test kompletne business partner funkcionalnosti
 * Testira sve aspekte business partner sistema uključujući:
 * - Registraciju
 * - Autentifikaciju
 * - Bezbednosne provjere
 * - Kreiranje klijenata
 * - Kreiranje servisa
 * - Pristup servisima
 */

const axios = require('axios');
const fs = require('fs');

// Konfiguracija
const BASE_URL = 'http://localhost:5000';
const ADMIN_CREDENTIALS = {
  username: 'jelena@frigosistemtodosijevic.me',
  password: 'admin123'
};

// Test korisnik za poslovnog partnera
const TEST_PARTNER = {
  username: 'test-partner@example.com',
  password: 'test123456',
  fullName: 'Test Partner',
  companyName: 'Test Company d.o.o',
  phone: '+382 69 123 456',
  address: 'Test ulica 123',
  city: 'Podgorica',
  role: 'business_partner'
};

// Kreiranje axios instance-a sa cookie podrşkom
const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Konfiguracija za čuvanje cookies
const cookieJar = {};
axiosInstance.defaults.jar = cookieJar;

// Test rezultati
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

function logResult(testName, success, message = '') {
  const status = success ? '✓' : '✗';
  console.log(`${status} ${testName}`);
  if (message) {
    console.log(`  ${message}`);
  }
  
  if (success) {
    testResults.passed++;
  } else {
    testResults.failed++;
    testResults.errors.push(`${testName}: ${message}`);
  }
}

// Funkcija za čuvanje cookies
function saveCookies(response) {
  const cookies = response.headers['set-cookie'];
  if (cookies) {
    cookies.forEach(cookie => {
      const [nameValue] = cookie.split(';');
      const [name, value] = nameValue.split('=');
      cookieJar[name] = value;
    });
  }
}

// Funkcija za učitavanje cookies u zahtjev
function loadCookies() {
  const cookieString = Object.entries(cookieJar)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
  return cookieString;
}

// Dodavanje interceptora za cookies
axiosInstance.interceptors.request.use(config => {
  const cookies = loadCookies();
  if (cookies) {
    config.headers.Cookie = cookies;
  }
  return config;
});

axiosInstance.interceptors.response.use(response => {
  saveCookies(response);
  return response;
}, error => {
  if (error.response) {
    saveCookies(error.response);
  }
  throw error;
});

async function runTests() {
  console.log('=== TESTIRANJE BUSINESS PARTNER FUNKCIONALNOSTI ===\n');
  
  try {
    // 1. Test registracije poslovnog partnera
    console.log('1. Testiranje registracije poslovnog partnera');
    
    try {
      const registerResponse = await axiosInstance.post('/api/auth/register', TEST_PARTNER);
      logResult('Registracija poslovnog partnera', true, 'Uspešno registrovan');
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      logResult('Registracija poslovnog partnera', false, `Greška: ${errorMsg}`);
    }
    
    // 2. Test prijave admin korisnika za verifikaciju
    console.log('\n2. Prijava admin korisnika za verifikaciju');
    
    try {
      const adminLoginResponse = await axiosInstance.post('/api/auth/login', ADMIN_CREDENTIALS);
      logResult('Admin prijava', true, 'Admin uspešno prijavljen');
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      logResult('Admin prijava', false, `Greška: ${errorMsg}`);
      return;
    }
    
    // 3. Verifikacija poslovnog partnera
    console.log('\n3. Verifikacija poslovnog partnera');
    
    try {
      // Prvo dohvati sve korisnike
      const usersResponse = await axiosInstance.get('/api/users');
      const users = usersResponse.data;
      
      // Proveri da li je users niz
      if (!Array.isArray(users)) {
        console.error('Users response is not an array:', users);
        logResult('Verifikacija poslovnog partnera', false, 'API ne vraća niz korisnika');
        return;
      }
      
      // Pronađi test partnera
      const testPartner = users.find(u => u.username === TEST_PARTNER.username);
      
      if (testPartner) {
        // Verifikuj partnera
        const verifyResponse = await axiosInstance.post(`/api/admin/users/${testPartner.id}/verify`);
        logResult('Verifikacija poslovnog partnera', true, 'Partner verifikovan');
      } else {
        logResult('Verifikacija poslovnog partnera', false, 'Partner nije pronađen');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      logResult('Verifikacija poslovnog partnera', false, `Greška: ${errorMsg}`);
    }
    
    // 4. Odjava admin korisnika
    console.log('\n4. Odjava admin korisnika');
    
    try {
      await axiosInstance.post('/api/auth/logout');
      logResult('Admin odjava', true, 'Admin uspešno odjavljen');
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      logResult('Admin odjava', false, `Greška: ${errorMsg}`);
    }
    
    // 5. Test prijave poslovnog partnera
    console.log('\n5. Testiranje prijave poslovnog partnera');
    
    try {
      const loginResponse = await axiosInstance.post('/api/auth/login', {
        username: TEST_PARTNER.username,
        password: TEST_PARTNER.password
      });
      
      const user = loginResponse.data;
      if (user.role === 'business_partner') {
        logResult('Prijava poslovnog partnera', true, 'Uspešno prijavljen sa ispravnom ulogom');
      } else {
        logResult('Prijava poslovnog partnera', false, `Neočekivana uloga: ${user.role}`);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      logResult('Prijava poslovnog partnera', false, `Greška: ${errorMsg}`);
    }
    
    // 6. Test pristupa business partner ruta
    console.log('\n6. Testiranje pristupa business partner ruta');
    
    try {
      const clientsResponse = await axiosInstance.get('/api/business/clients');
      logResult('Pristup lista klijenata', true, `Dohvaćeno ${clientsResponse.data.length} klijenata`);
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      logResult('Pristup lista klijenata', false, `Greška: ${errorMsg}`);
    }
    
    try {
      const newClientDataResponse = await axiosInstance.get('/api/business/clients/new');
      logResult('Pristup podacima za novi klijent', true, 'Podaci dohvaćeni');
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      logResult('Pristup podacima za novi klijent', false, `Greška: ${errorMsg}`);
    }
    
    // 7. Test kreiranja klijenta
    console.log('\n7. Testiranje kreiranja klijenta');
    
    const testClient = {
      name: 'Test Klijent',
      email: 'test-klijent@example.com',
      phone: '+382 69 987 654',
      address: 'Test adresa 456',
      city: 'Nikšić',
      isCompany: false
    };
    
    try {
      const createClientResponse = await axiosInstance.post('/api/business/clients', testClient);
      const newClient = createClientResponse.data;
      logResult('Kreiranje klijenta', true, `Kreiran klijent sa ID: ${newClient.id}`);
      
      // Sačuvaj ID klijenta za dalje testiranje
      global.testClientId = newClient.id;
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      logResult('Kreiranje klijenta', false, `Greška: ${errorMsg}`);
    }
    
    // 8. Test kreiranja uređaja (samo ako je klijent kreiran)
    if (global.testClientId) {
      console.log('\n8. Testiranje kreiranja uređaja');
      
      const testAppliance = {
        clientId: global.testClientId,
        categoryId: 1, // Pretpostavljam da postoji kategorija sa ID 1
        manufacturerId: 1, // Pretpostavljam da postoji proizvođač sa ID 1
        model: 'Test Model XYZ',
        serialNumber: 'TEST123456',
        purchaseDate: new Date().toISOString(),
        warrantyMonths: 24
      };
      
      try {
        const createApplianceResponse = await axiosInstance.post('/api/appliances', testAppliance);
        const newAppliance = createApplianceResponse.data;
        logResult('Kreiranje uređaja', true, `Kreiran uređaj sa ID: ${newAppliance.id}`);
        
        // Sačuvaj ID uređaja za dalje testiranje
        global.testApplianceId = newAppliance.id;
      } catch (error) {
        const errorMsg = error.response?.data?.message || error.message;
        logResult('Kreiranje uređaja', false, `Greška: ${errorMsg}`);
      }
    }
    
    // 9. Test kreiranja servisa (samo ako su klijent i uređaj kreirani)
    if (global.testClientId && global.testApplianceId) {
      console.log('\n9. Testiranje kreiranja servisa');
      
      const testService = {
        clientId: global.testClientId,
        applianceId: global.testApplianceId,
        problemDescription: 'Test problem opisa',
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Sutra
      };
      
      try {
        const createServiceResponse = await axiosInstance.post('/api/business/services', testService);
        const newService = createServiceResponse.data;
        logResult('Kreiranje servisa', true, `Kreiran servis sa ID: ${newService.id}`);
        
        // Sačuvaj ID servisa za dalje testiranje
        global.testServiceId = newService.id;
      } catch (error) {
        const errorMsg = error.response?.data?.message || error.message;
        logResult('Kreiranje servisa', false, `Greška: ${errorMsg}`);
      }
    }
    
    // 10. Test pristupa servisu
    if (global.testServiceId) {
      console.log('\n10. Testiranje pristupa servisu');
      
      try {
        const serviceResponse = await axiosInstance.get(`/api/business/services/${global.testServiceId}`);
        const service = serviceResponse.data;
        logResult('Pristup servisu', true, `Dohvaćen servis: ${service.problemDescription}`);
      } catch (error) {
        const errorMsg = error.response?.data?.message || error.message;
        logResult('Pristup servisu', false, `Greška: ${errorMsg}`);
      }
    }
    
    // 11. Test bezbednosnih provjera - pokušaj pristupa tuđem servisu
    console.log('\n11. Testiranje bezbednosnih provjera');
    
    try {
      // Pokušaj pristupa servisu sa ID 1 (vjerovatno ne pripada test partneru)
      const unauthorizedResponse = await axiosInstance.get('/api/business/services/1');
      logResult('Bezbednosna provjera', false, 'Neautorizovan pristup dozvoljen');
    } catch (error) {
      if (error.response?.status === 403) {
        logResult('Bezbednosna provjera', true, 'Neautorizovan pristup blokiran');
      } else {
        const errorMsg = error.response?.data?.message || error.message;
        logResult('Bezbednosna provjera', false, `Neočekivana greška: ${errorMsg}`);
      }
    }
    
    // 12. Test odjave
    console.log('\n12. Testiranje odjave');
    
    try {
      await axiosInstance.post('/api/auth/logout');
      logResult('Odjava poslovnog partnera', true, 'Uspešno odjavljen');
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      logResult('Odjava poslovnog partnera', false, `Greška: ${errorMsg}`);
    }
    
    // 13. Test pristupa nakon odjave
    console.log('\n13. Testiranje pristupa nakon odjave');
    
    try {
      const unauthorizedResponse = await axiosInstance.get('/api/business/clients');
      logResult('Pristup nakon odjave', false, 'Neautorizovan pristup dozvoljen');
    } catch (error) {
      if (error.response?.status === 401) {
        logResult('Pristup nakon odjave', true, 'Neautorizovan pristup blokiran');
      } else {
        const errorMsg = error.response?.data?.message || error.message;
        logResult('Pristup nakon odjave', false, `Neočekivana greška: ${errorMsg}`);
      }
    }
    
  } catch (error) {
    console.error('Opšta greška pri testiranju:', error.message);
    testResults.failed++;
    testResults.errors.push(`Opšta greška: ${error.message}`);
  }
  
  // Rezultati
  console.log('\n=== REZULTATI TESTIRANJA ===');
  console.log(`Uspešno: ${testResults.passed}`);
  console.log(`Neuspešno: ${testResults.failed}`);
  console.log(`Ukupno: ${testResults.passed + testResults.failed}`);
  
  if (testResults.failed > 0) {
    console.log('\n=== GREŠKE ===');
    testResults.errors.forEach(error => {
      console.log(`- ${error}`);
    });
  }
  
  // Zapisivanje rezultata u fajl
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      passed: testResults.passed,
      failed: testResults.failed,
      total: testResults.passed + testResults.failed
    },
    errors: testResults.errors
  };
  
  fs.writeFileSync('business-partner-test-results.json', JSON.stringify(report, null, 2));
  console.log('\nRezultati sačuvani u business-partner-test-results.json');
}

// Pokretanje testova
runTests().catch(console.error);