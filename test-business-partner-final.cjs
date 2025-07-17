/**
 * Finalni test business partner funkcionalnosti
 * Testira kompletnu funkcionalnost sa ispravnom session logikom
 */

const axios = require('axios');
const fs = require('fs');

// Konfiguracija
const BASE_URL = 'http://localhost:5000';
const ADMIN_CREDENTIALS = {
  username: 'jelena@frigosistemtodosijevic.me',
  password: 'admin123'
};

// Test kredencijali za business partner
const BP_CREDENTIALS = {
  username: 'test-bp-final2@example.com',
  password: 'test123456',
  fullName: 'Test Business Partner Final 2',
  email: 'test-bp-final2@example.com',
  role: 'business_partner',
  companyName: 'Test Company Final',
  phone: '+382 69 123 456',
  address: 'Test adresa',
  city: 'Podgorica'
};

// Kreiranje axios instance-a sa cookie podrşkom
const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Cookie jar
const cookieJar = {};

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

async function runTests() {
  console.log('=== FINALNI TEST BUSINESS PARTNER FUNKCIONALNOSTI ===\n');
  
  let businessPartnerUser = null;
  
  try {
    // 1. Registracija business partner-a
    console.log('1. Registracija business partner-a');
    try {
      const response = await axiosInstance.post('/api/register', BP_CREDENTIALS);
      businessPartnerUser = response.data;
      logResult('Registracija poslovnog partnera', true, 'Uspešno registrovan');
    } catch (error) {
      logResult('Registracija poslovnog partnera', false, error.response?.data?.message || error.message);
      return;
    }
    
    // 2. Admin login
    console.log('\n2. Admin login za verifikaciju');
    try {
      const response = await axiosInstance.post('/api/login', ADMIN_CREDENTIALS);
      logResult('Admin prijava', true, 'Admin uspešno prijavljen');
    } catch (error) {
      logResult('Admin prijava', false, error.response?.data?.message || error.message);
      return;
    }
    
    // 3. Verifikacija business partner-a
    console.log('\n3. Verifikacija business partner-a');
    try {
      const response = await axiosInstance.post(`/api/users/${businessPartnerUser.id}/verify`);
      logResult('Verifikacija poslovnog partnera', true, 'Uspešno verifikovan');
    } catch (error) {
      logResult('Verifikacija poslovnog partnera', false, error.response?.data?.message || error.message);
      return;
    }
    
    // 4. Admin logout
    console.log('\n4. Admin logout');
    try {
      await axiosInstance.post('/api/logout');
      logResult('Admin odjava', true, 'Admin uspešno odjavljen');
    } catch (error) {
      logResult('Admin odjava', false, error.response?.data?.message || error.message);
    }
    
    // 5. Business partner login
    console.log('\n5. Business partner login');
    try {
      const response = await axiosInstance.post('/api/login', {
        username: 'test-bp-final2@example.com',
        password: 'test123456'
      });
      if (response.data.role === 'business_partner') {
        logResult('Prijava poslovnog partnera', true, 'Uspešno prijavljen');
      } else {
        logResult('Prijava poslovnog partnera', false, `Neočekivana uloga: ${response.data.role}`);
      }
    } catch (error) {
      logResult('Prijava poslovnog partnera', false, error.response?.data?.message || error.message);
      return;
    }
    
    // 6. Test pristupa business partner ruta
    console.log('\n6. Test pristupa business partner ruta');
    try {
      const response = await axiosInstance.get('/api/business/clients');
      logResult('Pristup lista klijenata', true, `Pristup dozvoljen, pronađeno ${response.data.length} klijenata`);
    } catch (error) {
      logResult('Pristup lista klijenata', false, error.response?.data?.message || error.message);
    }
    
    // 7. Test kreiranja klijenta
    console.log('\n7. Test kreiranja klijenta');
    try {
      const clientData = {
        fullName: 'Test Klijent',
        email: 'test@example.com',
        phone: '+382 69 123 456',
        address: 'Test adresa',
        city: 'Podgorica'
      };
      
      const response = await axiosInstance.post('/api/business/clients', clientData);
      logResult('Kreiranje klijenta', true, `Klijent kreiran sa ID: ${response.data.id}`);
    } catch (error) {
      logResult('Kreiranje klijenta', false, error.response?.data?.message || error.message);
    }
    
    // 8. Test pristupa podacima za novi klijent
    console.log('\n8. Test pristupa podacima za novi klijent');
    try {
      const response = await axiosInstance.get('/api/business/clients/new');
      logResult('Pristup podacima za novi klijent', true, 'Podaci uspešno učitani');
    } catch (error) {
      logResult('Pristup podacima za novi klijent', false, error.response?.data?.message || error.message);
    }
    
    // 9. Test odjave
    console.log('\n9. Test odjave');
    try {
      await axiosInstance.post('/api/logout');
      logResult('Odjava poslovnog partnera', true, 'Uspešno odjavljen');
    } catch (error) {
      logResult('Odjava poslovnog partnera', false, error.response?.data?.message || error.message);
    }
    
    // 10. Test pristupa nakon odjave
    console.log('\n10. Test pristupa nakon odjave');
    try {
      const response = await axiosInstance.get('/api/business/clients');
      logResult('Pristup nakon odjave', false, 'Pristup trebalo bi biti blokiran');
    } catch (error) {
      if (error.response?.status === 401) {
        logResult('Pristup nakon odjave', true, 'Neautorizovan pristup pravilno blokiran');
      } else {
        logResult('Pristup nakon odjave', false, error.response?.data?.message || error.message);
      }
    }
    
  } catch (error) {
    console.error('Neočekivana greška:', error.message);
  }
  
  // Prikaz rezultata
  console.log('\n=== REZULTATI FINALNOG TESTA ===');
  console.log(`Uspešno: ${testResults.passed}`);
  console.log(`Neuspešno: ${testResults.failed}`);
  console.log(`Ukupno: ${testResults.passed + testResults.failed}`);
  
  if (testResults.failed > 0) {
    console.log('\n=== GREŠKE ===');
    testResults.errors.forEach(error => {
      console.log(`- ${error}`);
    });
  }
  
  // Čuvanje rezultata u fajl
  const results = {
    timestamp: new Date().toISOString(),
    passed: testResults.passed,
    failed: testResults.failed,
    total: testResults.passed + testResults.failed,
    errors: testResults.errors
  };
  
  fs.writeFileSync('business-partner-final-results.json', JSON.stringify(results, null, 2));
  console.log('\nRezultati sačuvani u business-partner-final-results.json');
}

runTests().catch(console.error);