import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

async function testAuth() {
  console.log('🔍 Testiranje autentifikacije...\n');

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
    
    console.log('Login status:', loginResponse.status);
    console.log('Login data:', loginResponse.data);
    
    if (loginResponse.status === 200) {
      const cookies = loginResponse.headers['set-cookie'];
      const adminCookies = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '';
      console.log('✅ Admin login uspešan');
      console.log('Cookies:', adminCookies);
      
      // 2. Testiraj autentifikaciju
      console.log('\n2. Testiranje autentifikacije...');
      const userResponse = await axios.get(`${BASE_URL}/api/user`, {
        headers: { Cookie: adminCookies },
        withCredentials: true,
        validateStatus: () => true
      });
      
      console.log('User status:', userResponse.status);
      console.log('User data:', userResponse.data);
      
      if (userResponse.status === 200) {
        console.log('✅ Autentifikacija radi');
        
        // 3. Testiraj spare parts endpoint
        console.log('\n3. Testiranje spare parts endpointa...');
        const spareResponse = await axios.post(`${BASE_URL}/api/services/1/spare-parts`, {
          partName: 'Test rezervni deo',
          catalogNumber: 'TEST-001',
          urgency: 'medium',
          description: 'Test opis rezervnog dela'
        }, {
          headers: { Cookie: adminCookies },
          withCredentials: true,
          validateStatus: () => true
        });
        
        console.log('Spare parts status:', spareResponse.status);
        console.log('Spare parts data:', spareResponse.data);
      } else {
        console.log('❌ Autentifikacija ne radi');
      }
    } else {
      console.log('❌ Admin login neuspešan');
    }
  } catch (error) {
    console.error('Greška:', error.message);
  }
}

testAuth();