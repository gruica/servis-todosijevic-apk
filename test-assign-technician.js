import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

async function testAssignTechnician() {
  console.log('🔍 Testiranje dodeljivanja servisera...\n');

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
      const adminCookies = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '';
      console.log('✅ Admin login uspešan');
      
      // 2. Dobij listu servisa
      console.log('\n2. Dobijam listu servisa...');
      const servicesResponse = await axios.get(`${BASE_URL}/api/admin/services`, {
        headers: { Cookie: adminCookies },
        withCredentials: true,
        validateStatus: () => true
      });
      
      if (servicesResponse.status === 200 && servicesResponse.data.length > 0) {
        const service = servicesResponse.data[0];
        console.log(`✅ Pronađen servis ID: ${service.id}, trenutni serviser: ${service.technicianId || 'nema'}`);
        
        // 3. Dobij listu servisera
        console.log('\n3. Dobijam listu servisera...');
        const techniciansResponse = await axios.get(`${BASE_URL}/api/technicians`, {
          headers: { Cookie: adminCookies },
          withCredentials: true,
          validateStatus: () => true
        });
        
        if (techniciansResponse.status === 200 && techniciansResponse.data.length > 0) {
          const technician = techniciansResponse.data[0];
          console.log(`✅ Pronađen serviser ID: ${technician.id}, ime: ${technician.fullName}`);
          
          // 4. Testiraj prvi endpoint
          console.log('\n4. Testiram prvi endpoint /api/services/:id/assign-technician...');
          const assign1Response = await axios.put(`${BASE_URL}/api/services/${service.id}/assign-technician`, {
            technicianId: technician.id
          }, {
            headers: { Cookie: adminCookies },
            withCredentials: true,
            validateStatus: () => true
          });
          
          console.log('Status:', assign1Response.status);
          console.log('Data:', assign1Response.data);
          
          // 5. Testiraj drugi endpoint
          console.log('\n5. Testiram drugi endpoint /api/admin/services/:id/assign-technician...');
          const assign2Response = await axios.put(`${BASE_URL}/api/admin/services/${service.id}/assign-technician`, {
            technicianId: technician.id
          }, {
            headers: { Cookie: adminCookies },
            withCredentials: true,
            validateStatus: () => true
          });
          
          console.log('Status:', assign2Response.status);
          console.log('Data:', assign2Response.data);
          
        } else {
          console.log('❌ Nema servisera u bazi');
        }
      } else {
        console.log('❌ Nema servisa u bazi');
      }
    } else {
      console.log('❌ Admin login neuspešan');
    }
  } catch (error) {
    console.error('Greška:', error.message);
  }
}

testAssignTechnician();