/**
 * Specifičan test za Gruica korisnički nalog
 * Proverava kompletan workflow od login-a do prikazivanja servisa
 */

import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';

// Kreiraj cookie jar i wrapper za axios
const jar = new CookieJar();
const api = wrapper(axios.create({
  baseURL: 'http://localhost:5000',
  withCredentials: true,
  timeout: 10000,
  jar,
  headers: {
    'Content-Type': 'application/json'
  }
}));

async function testGruicaWorkflow() {
  console.log('🎯 SPECIFIČAN TEST ZA GRUICA KORISNIČKI NALOG');
  console.log('=' .repeat(50));
  
  try {
    // 1. Login
    console.log('\n1. 🔐 Login test...');
    const loginResponse = await api.post('/api/login', {
      username: 'gruica@frigosistemtodosijevic.com',
      password: 'serviser123'
    });
    
    console.log('✅ Login uspešan:', loginResponse.data.fullName);
    console.log('   - Role:', loginResponse.data.role);
    console.log('   - Technician ID:', loginResponse.data.technicianId);
    
    // 2. Provera korisničkih podataka
    console.log('\n2. 👤 Provera korisničkih podataka...');
    const userResponse = await api.get('/api/user');
    console.log('✅ Korisnički podaci:', userResponse.data.fullName);
    
    // 3. Dobijanje servisa
    console.log('\n3. 📋 Dobijanje servisa...');
    const servicesResponse = await api.get('/api/my-services');
    console.log('✅ Servisi dobijeni:', servicesResponse.data.length + ' servisa');
    
    if (servicesResponse.data.length > 0) {
      servicesResponse.data.forEach((service, index) => {
        console.log(`   ${index + 1}. Servis #${service.id}`);
        console.log(`      - Status: ${service.status}`);
        console.log(`      - Opis: ${service.description}`);
        console.log(`      - Klijent: ${service.client?.fullName || 'N/A'}`);
        console.log(`      - Telefon: ${service.client?.phone || 'N/A'}`);
        console.log(`      - Adresa: ${service.client?.address || 'N/A'}`);
        console.log(`      - Grad: ${service.client?.city || 'N/A'}`);
        console.log(`      - Uređaj: ${service.appliance?.category?.name || 'N/A'}`);
        console.log(`      - Model: ${service.appliance?.model || 'N/A'}`);
        console.log(`      - Kreiran: ${service.createdAt}`);
        console.log(`      - Zakazan: ${service.scheduledDate || 'Nije zakazan'}`);
        console.log();
      });
    }
    
    // 4. Testiranje ažuriranja servisa
    if (servicesResponse.data.length > 0) {
      const testService = servicesResponse.data[0];
      console.log(`4. 🔧 Testiranje ažuriranja servisa #${testService.id}...`);
      
      try {
        const updateResponse = await api.put(`/api/services/${testService.id}`, {
          technicianNotes: `Test napomena od Gruica - ${new Date().toISOString()}`
        });
        console.log('✅ Servis uspešno ažuriran');
      } catch (updateError) {
        console.log('❌ Greška pri ažuriranju:', updateError.response?.data?.error || updateError.message);
      }
    }
    
    // 5. Testiranje notifikacija
    console.log('\n5. 🔔 Testiranje notifikacija...');
    const notificationsResponse = await api.get('/api/notifications');
    console.log('✅ Notifikacije dobijene:', notificationsResponse.data.length + ' notifikacija');
    
    // 6. Testiranje kategorija i proizvođača
    console.log('\n6. 📦 Testiranje kategorija i proizvođača...');
    const [categoriesResponse, manufacturersResponse] = await Promise.all([
      api.get('/api/appliance-categories'),
      api.get('/api/manufacturers')
    ]);
    
    console.log('✅ Kategorije dobijene:', categoriesResponse.data.length + ' kategorija');
    console.log('✅ Proizvođači dobijeni:', manufacturersResponse.data.length + ' proizvođača');
    
    // 7. Logout test
    console.log('\n7. 🚪 Logout test...');
    await api.post('/api/logout');
    console.log('✅ Logout uspešan');
    
    // 8. Finalni izveštaj
    console.log('\n' + '=' .repeat(50));
    console.log('🎉 GRUICA KORISNIČKI NALOG JE POTPUNO FUNKCIONALAN!');
    console.log('=' .repeat(50));
    
    return true;
    
  } catch (error) {
    console.error('❌ Greška u testiranju:', error.response?.data || error.message);
    return false;
  }
}

// Pokretanje testa
testGruicaWorkflow().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Kritična greška:', error);
  process.exit(1);
});