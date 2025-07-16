import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

async function testCompleteAPI() {
  console.log('🔍 Testiranje kompletnog API-ja za rezervne delove...\n');

  let adminCookies = '';
  let serviceId = null;
  let applianceId = null;

  try {
    // 1. Login kao admin
    console.log('1. Prijavljivanje kao admin...');
    const loginResponse = await axios.post(`${BASE_URL}/api/login`, {
      username: 'jelena@frigosistemtodosijevic.me',
      password: 'admin123'
    }, {
      withCredentials: true,
      validateStatus: () => true
    });
    
    if (loginResponse.status === 200) {
      const cookies = loginResponse.headers['set-cookie'];
      adminCookies = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '';
      console.log('✅ Admin login uspešan');
    } else {
      throw new Error('Admin login neuspešan');
    }

    // 2. Proveri postojanje klijenata
    console.log('\n2. Provera postojanja klijenata...');
    const clientsResponse = await axios.get(`${BASE_URL}/api/clients`, {
      headers: { Cookie: adminCookies },
      withCredentials: true,
      validateStatus: () => true
    });
    
    if (clientsResponse.status === 200 && clientsResponse.data.length > 0) {
      console.log(`✅ Pronađeno ${clientsResponse.data.length} klijenata`);
    } else {
      console.log('❌ Nema klijenata u bazi. Kreiranje test klijenta...');
      const newClientResponse = await axios.post(`${BASE_URL}/api/clients`, {
        fullName: 'Test Klijent',
        email: 'test@example.com',
        phone: '067123456',
        address: 'Test adresa 123',
        city: 'Podgorica'
      }, {
        headers: { Cookie: adminCookies },
        withCredentials: true,
        validateStatus: () => true
      });
      
      if (newClientResponse.status === 201) {
        console.log('✅ Test klijent kreiran');
      } else {
        console.log('❌ Greška pri kreiranju klijenta:', newClientResponse.data);
        return;
      }
    }
    
    // 3. Proveri postojanje uređaja
    console.log('\n3. Provera postojanja uređaja...');
    const appliancesResponse = await axios.get(`${BASE_URL}/api/appliances`, {
      headers: { Cookie: adminCookies },
      withCredentials: true,
      validateStatus: () => true
    });
    
    if (appliancesResponse.status === 200 && appliancesResponse.data.length > 0) {
      console.log(`✅ Pronađeno ${appliancesResponse.data.length} uređaja`);
    } else {
      console.log('❌ Nema uređaja u bazi. Test će koristiti osnovne podatke...');
      return;
    }

    // 4. Kreiraj test servis
    console.log('\n4. Kreiranje test servisa...');
    const serviceResponse = await axios.post(`${BASE_URL}/api/services`, {
      clientId: 1,
      applianceId: 1,
      technicianId: 1,
      description: 'Test servis za rezervne delove',
      status: 'in_progress',
      warrantyStatus: 'not_in_warranty',
      scheduledDate: '2025-07-17',
      cost: 100
    }, {
      headers: { Cookie: adminCookies },
      withCredentials: true,
      validateStatus: () => true
    });
    
    if (serviceResponse.status === 201) {
      serviceId = serviceResponse.data.id;
      console.log(`✅ Test servis kreiran (ID: ${serviceId})`);
    } else {
      console.log('❌ Greška pri kreiranju servisa:', serviceResponse.status, serviceResponse.data);
      return;
    }

    // 3. Zatraži rezervni deo
    console.log('\n3. Zahtev za rezervni deo...');
    const sparePartResponse = await axios.post(`${BASE_URL}/api/services/${serviceId}/spare-parts`, {
      partName: 'Test rezervni deo',
      catalogNumber: 'TEST-001',
      urgency: 'medium',
      description: 'Test opis rezervnog dela'
    }, {
      headers: { Cookie: adminCookies },
      withCredentials: true,
      validateStatus: () => true
    });
    
    if (sparePartResponse.status === 201) {
      console.log('✅ Rezervni deo zahtevam uspešno');
      console.log('Data:', sparePartResponse.data);
    } else {
      console.log('❌ Greška pri zahtevu za rezervni deo:', sparePartResponse.status, sparePartResponse.data);
    }

    // 4. Proveri status servisa
    console.log('\n4. Provera statusa servisa...');
    const statusResponse = await axios.get(`${BASE_URL}/api/admin/services/${serviceId}`, {
      headers: { Cookie: adminCookies },
      withCredentials: true,
      validateStatus: () => true
    });
    
    if (statusResponse.status === 200) {
      console.log('✅ Status servisa:', statusResponse.data.status);
    } else {
      console.log('❌ Greška pri proveri statusa:', statusResponse.status, statusResponse.data);
    }

    // 5. Pokušaj da pristupiš waiting-for-parts endpointu
    console.log('\n5. Testiranje waiting-for-parts endpointa...');
    const waitingResponse = await axios.get(`${BASE_URL}/api/admin/services/waiting-for-parts`, {
      headers: { Cookie: adminCookies },
      withCredentials: true,
      validateStatus: () => true
    });
    
    if (waitingResponse.status === 200) {
      console.log('✅ Waiting-for-parts endpoint radi');
      console.log('Servisi koji čekaju delove:', waitingResponse.data.length);
    } else {
      console.log('❌ Greška u waiting-for-parts endpointu:', waitingResponse.status, waitingResponse.data);
    }

    // 6. Očisti - obriši test servis
    console.log('\n6. Brisanje test servisa...');
    const deleteResponse = await axios.delete(`${BASE_URL}/api/admin/services/${serviceId}`, {
      headers: { Cookie: adminCookies },
      withCredentials: true,
      validateStatus: () => true
    });
    
    if (deleteResponse.status === 204) {
      console.log('✅ Test servis obrisan');
    } else {
      console.log('❌ Greška pri brisanju servisa:', deleteResponse.status, deleteResponse.data);
    }

  } catch (error) {
    console.error('❌ Greška u testu:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }

  console.log('\n🏁 Test završen');
}

testCompleteAPI();