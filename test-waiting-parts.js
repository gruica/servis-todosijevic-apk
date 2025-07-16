import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

async function testWaitingParts() {
  console.log('🔍 Testiranje waiting-for-parts endpointa...\n');

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
    
    if (loginResponse.status !== 200) {
      throw new Error('Admin login neuspešan');
    }

    const cookies = loginResponse.headers['set-cookie'];
    const adminCookies = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '';
    console.log('✅ Admin login uspešan');

    // 2. Test waiting-for-parts endpoint
    console.log('\n2. Testiranje waiting-for-parts endpointa...');
    const waitingResponse = await axios.get(`${BASE_URL}/api/admin/services/waiting-for-parts`, {
      headers: { Cookie: adminCookies },
      withCredentials: true,
      validateStatus: () => true
    });
    
    console.log('Status:', waitingResponse.status);
    console.log('Data:', waitingResponse.data);
    
    if (waitingResponse.status === 200) {
      console.log('✅ Waiting-for-parts endpoint radi');
      console.log(`Broj servisa koji čekaju delove: ${waitingResponse.data.length}`);
    } else {
      console.log('❌ Greška u waiting-for-parts endpointu');
    }

  } catch (error) {
    console.error('❌ Greška u testu:', error.message);
  }

  console.log('\n🏁 Test završen');
}

testWaitingParts();