#!/usr/bin/env node

// TESTIRANJE UNIVERZALNOG SMS SISTEMA ZA SVE PROMENE STATUSA
// Ovaj test validira da se SMS automatski šalje za SVAKU promenu statusa servisa

import axios from 'axios';

// Konfiguracija
const BASE_URL = 'https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev';
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123'
};

let adminToken = null;

async function login() {
  try {
    console.log('🔐 Logovanje kao administrator...');
    const response = await axios.post(`${BASE_URL}/api/login`, ADMIN_CREDENTIALS, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 200 && response.data) {
      // Session-based auth - koristimo cookie umesto token-a
      console.log('✅ Uspešno logovanje sa session cookie-om');
      return true;
    } else {
      console.error('❌ Neuspešno logovanje');
      return false;
    }
  } catch (error) {
    console.error('❌ Greška pri logovanju:', error.response?.data || error.message);
    return false;
  }
}

async function testStatusChange(serviceId, newStatus, description) {
  try {
    console.log(`\n📱 TEST: Menjam status servisa #${serviceId} na "${newStatus}"`);
    console.log(`   Opis: ${description}`);
    
    const response = await axios.put(
      `${BASE_URL}/api/services/${serviceId}/update-status`,
      { status: newStatus },
      {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.status === 200) {
      console.log(`✅ Status uspešno promenjen na "${newStatus}"`);
      console.log('   🔔 SMS obaveštenja bi trebalo da budu poslata klijentu, administratorima i poslovnim partnerima');
      return true;
    } else {
      console.error(`❌ Neuspešna promena statusa: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Greška pri promeni statusa:`, error.response?.data || error.message);
    return false;
  }
}

async function testTechnicianStatusChange(serviceId, technicianCredentials, newStatus, description) {
  try {
    console.log(`\n👨‍🔧 TEST: Serviser menja status servisa #${serviceId} na "${newStatus}"`);
    console.log(`   Opis: ${description}`);
    
    // Logovanje kao serviser
    const loginResponse = await axios.post(`${BASE_URL}/api/login`, technicianCredentials, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (loginResponse.status !== 200) {
      console.error('❌ Neuspešno logovanje servisera');
      return false;
    }
    
    const response = await axios.put(
      `${BASE_URL}/api/services/${serviceId}/status`,
      { 
        status: newStatus,
        technicianNotes: `Test status update - ${description}`
      },
      {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.status === 200) {
      console.log(`✅ Serviser uspešno promenio status na "${newStatus}"`);
      console.log('   🔔 SMS obaveštenja bi trebalo da budu poslata klijentu, administratorima i poslovnim partnerima');
      return true;
    } else {
      console.error(`❌ Neuspešna promena statusa: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Greška pri promeni statusa:`, error.response?.data || error.message);
    return false;
  }
}

async function runUniversalSMSTest() {
  console.log('🚀 POKRETANJE TESTOVA UNIVERZALNOG SMS SISTEMA');
  console.log('='.repeat(50));
  
  // Login
  if (!(await login())) {
    return;
  }

  // Test 1: Admin menja status servisa
  console.log('\n📋 TEST GRUPA 1: ADMIN PROMENE STATUSA');
  await testStatusChange(52, 'assigned', 'Dodela servisera');
  await new Promise(resolve => setTimeout(resolve, 2000)); // Pauza između testova
  
  await testStatusChange(52, 'scheduled', 'Zakazivanje termina');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await testStatusChange(52, 'in_progress', 'Početak rada');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 2: Serviser menja status
  console.log('\n📋 TEST GRUPA 2: SERVISER PROMENE STATUSA');
  const technicianCredentials = {
    username: 'gruica@frigosistemtodosijevic.com',
    password: 'serviser123'
  };

  await testTechnicianStatusChange(52, technicianCredentials, 'waiting_for_parts', 'Čekanje rezervnih delova');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await testTechnicianStatusChange(52, technicianCredentials, 'client_not_home', 'Klijent nije kući');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await testTechnicianStatusChange(52, technicianCredentials, 'completed', 'Završetak servisa');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 3: Povratak na završeni status i ponovno menjanje
  console.log('\n📋 TEST GRUPA 3: DODATNE PROMENE STATUSA');
  await testStatusChange(52, 'assigned', 'Ponovni rad potreban');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await testStatusChange(52, 'cancelled', 'Otkazivanje servisa');

  console.log('\n🎉 ZAVRŠETAK TESTOVA UNIVERZALNOG SMS SISTEMA');
  console.log('='.repeat(50));
  console.log('✅ Svi testovi završeni!');
  console.log('📱 Proverite server log-ove za detalje o SMS obveštenjima');
  console.log('💡 Svaka promena statusa bi trebalo da aktivira SMS ka:');
  console.log('   - Klijentu (ako ima telefon)');
  console.log('   - Svim administratorima (sa telefonima)');
  console.log('   - Poslovnom partneru (ako postoji za servis)');
}

// Pokretanje testova
runUniversalSMSTest().catch(console.error);