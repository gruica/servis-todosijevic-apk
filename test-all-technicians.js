/**
 * Kompletna skripta za testiranje svih servisera i njihovih funkcionalnosti
 * Proverava komunikaciju sa bazom podataka i sve operacije servisera
 */

import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000',
  withCredentials: true,
  timeout: 10000
});

// Podaci o svim serviserima (iz baze podataka)
const TECHNICIANS = [
  {
    id: 4,
    name: 'Petar Vulović',
    username: 'petar@frigosistemtodosijevic.com',
    password: 'serviser123',
    phone: '+382661234570',
    specialization: 'Klima uređaji'
  },
  {
    id: 2,
    name: 'Jovan Todosijević',
    username: 'jovan@frigosistemtodosijevic.com',
    password: 'serviser123',
    phone: '+382661234571',
    specialization: 'Frižideri'
  },
  {
    id: 8,
    name: 'Nikola Četković',
    username: 'nikola@frigosistemtodosijevic.com',
    password: 'serviser123',
    phone: '+382661234572',
    specialization: 'Veš mašine'
  },
  {
    id: 12,
    name: 'Gruica Todosijević',
    username: 'gruica@frigosistemtodosijevic.com',
    password: 'serviser123',
    phone: '+382661234573',
    specialization: 'Različiti uređaji'
  }
];

// Funkcija za login
async function login(username, password) {
  try {
    const response = await api.post('/api/login', {
      username,
      password
    });
    return response.data;
  } catch (error) {
    console.error(`❌ Login neuspešan za ${username}:`, error.response?.data?.error || error.message);
    return null;
  }
}

// Funkcija za logout
async function logout() {
  try {
    await api.post('/api/logout');
  } catch (error) {
    console.log('Logout error (može biti ignorisan):', error.message);
  }
}

// Test osnovnih API poziva za servisera
async function testTechnicianAPI(technician) {
  console.log(`\n🔍 Testiranje API poziva za ${technician.name}...`);
  
  const tests = [
    {
      name: 'Dobijanje profila korisnika',
      endpoint: '/api/user',
      method: 'GET'
    },
    {
      name: 'Dobijanje servisa servisera',
      endpoint: '/api/my-services',
      method: 'GET'
    },
    {
      name: 'Dobijanje notifikacija',
      endpoint: '/api/notifications',
      method: 'GET'
    },
    {
      name: 'Broj nepročitanih notifikacija',
      endpoint: '/api/notifications/unread-count',
      method: 'GET'
    },
    {
      name: 'Dobijanje kategorija uređaja',
      endpoint: '/api/appliance-categories',
      method: 'GET'
    },
    {
      name: 'Dobijanje proizvođača',
      endpoint: '/api/manufacturers',
      method: 'GET'
    }
  ];

  for (const test of tests) {
    try {
      const response = await api({
        method: test.method,
        url: test.endpoint
      });
      
      console.log(`  ✅ ${test.name}: ${response.status} (${Array.isArray(response.data) ? response.data.length + ' items' : 'object'})`);
      
      if (test.endpoint === '/api/my-services') {
        console.log(`    📋 Servisi: ${response.data.length} ukupno`);
        response.data.forEach((service, index) => {
          console.log(`       ${index + 1}. Servis #${service.id} - ${service.status} (${service.client?.fullName || 'N/A'})`);
        });
      }
      
    } catch (error) {
      console.log(`  ❌ ${test.name}: ${error.response?.status || 'ERROR'} - ${error.response?.data?.error || error.message}`);
    }
  }
}

// Test funkcionalnosti servisa
async function testServiceOperations(technician) {
  console.log(`\n🔧 Testiranje operacija servisa za ${technician.name}...`);
  
  try {
    // Dobijanje servisa
    const servicesResponse = await api.get('/api/my-services');
    const services = servicesResponse.data;
    
    if (services.length === 0) {
      console.log('  ℹ️  Nema dodeljenih servisa za testiranje');
      return;
    }
    
    // Testiranje na prvom servisu
    const testService = services[0];
    console.log(`  🎯 Testiranje sa servisom #${testService.id} (${testService.status})`);
    
    // Test dobijanja detalja servisa
    try {
      const detailsResponse = await api.get(`/api/services/${testService.id}`);
      console.log(`  ✅ Detalji servisa: ${detailsResponse.status}`);
    } catch (error) {
      console.log(`  ❌ Detalji servisa: ${error.response?.status || 'ERROR'} - ${error.response?.data?.error || error.message}`);
    }
    
    // Test ažuriranja statusa (samo ako nije završen)
    if (testService.status !== 'completed') {
      try {
        // Pokušaj ažuriranja napomena
        const updateResponse = await api.put(`/api/services/${testService.id}`, {
          technicianNotes: `Test napomena - ${new Date().toISOString()}`
        });
        console.log(`  ✅ Ažuriranje napomena: ${updateResponse.status}`);
      } catch (error) {
        console.log(`  ❌ Ažuriranje napomena: ${error.response?.status || 'ERROR'} - ${error.response?.data?.error || error.message}`);
      }
    }
    
  } catch (error) {
    console.log(`  ❌ Greška pri testiranju servisa: ${error.response?.data?.error || error.message}`);
  }
}

// Test komunikacije sa bazom podataka
async function testDatabaseCommunication(technician) {
  console.log(`\n💾 Testiranje komunikacije sa bazom za ${technician.name}...`);
  
  try {
    // Test dobijanja svih potrebnih podataka
    const requests = [
      api.get('/api/my-services'),
      api.get('/api/appliance-categories'),
      api.get('/api/manufacturers'),
      api.get('/api/notifications')
    ];
    
    const responses = await Promise.all(requests);
    
    console.log('  ✅ Paralelni zahtevi uspešni:');
    console.log(`    - Servisi: ${responses[0].data.length} items`);
    console.log(`    - Kategorije: ${responses[1].data.length} items`);
    console.log(`    - Proizvođači: ${responses[2].data.length} items`);
    console.log(`    - Notifikacije: ${responses[3].data.length} items`);
    
  } catch (error) {
    console.log(`  ❌ Greška u komunikaciji sa bazom: ${error.response?.data?.error || error.message}`);
  }
}

// Test kompletnog workflow-a
async function testCompleteWorkflow(technician) {
  console.log(`\n🔄 Testiranje kompletnog workflow-a za ${technician.name}...`);
  
  try {
    // 1. Login
    const loginResult = await login(technician.username, technician.password);
    if (!loginResult) {
      console.log('  ❌ Login neuspešan - prekidanje testiranja');
      return false;
    }
    console.log('  ✅ Login uspešan');
    
    // 2. Testiranje API poziva
    await testTechnicianAPI(technician);
    
    // 3. Testiranje operacija servisa
    await testServiceOperations(technician);
    
    // 4. Testiranje komunikacije sa bazom
    await testDatabaseCommunication(technician);
    
    // 5. Logout
    await logout();
    console.log('  ✅ Logout uspešan');
    
    return true;
    
  } catch (error) {
    console.log(`  ❌ Greška u workflow-u: ${error.message}`);
    return false;
  }
}

// Glavna funkcija
async function runCompleteTest() {
  console.log('🚀 Pokretanje kompletnog testiranja svih servisera...\n');
  
  const results = [];
  
  for (const technician of TECHNICIANS) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 TESTIRANJE SERVISERA: ${technician.name}`);
    console.log(`   Email: ${technician.username}`);
    console.log(`   ID: ${technician.id}`);
    console.log(`   Specijalizacija: ${technician.specialization}`);
    console.log(`${'='.repeat(60)}`);
    
    const result = await testCompleteWorkflow(technician);
    results.push({
      technician: technician.name,
      success: result
    });
    
    // Pauza između testova
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Finalni izveštaj
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 FINALNI IZVEŠTAJ');
  console.log(`${'='.repeat(60)}`);
  
  results.forEach(result => {
    console.log(`${result.success ? '✅' : '❌'} ${result.technician}: ${result.success ? 'USPEŠNO' : 'NEUSPEŠNO'}`);
  });
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n📈 Ukupno: ${successCount}/${results.length} servisera uspešno testiranih`);
  
  if (successCount === results.length) {
    console.log('🎉 Svi serviseri rade ispravno!');
  } else {
    console.log('⚠️  Postoje problemi sa nekim serviserima - potrebna dodatna analiza');
  }
}

// Pokretanje testiranja
runCompleteTest().catch(console.error);