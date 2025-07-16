import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

async function testAPI() {
  try {
    // Login as admin
    const loginResponse = await axios.post(`${BASE_URL}/api/login`, {
      username: 'jelena@frigosistemtodosijevic.me',
      password: 'admin123'
    }, {
      withCredentials: true,
      validateStatus: () => true
    });
    
    console.log('Login response:', loginResponse.status);
    
    if (loginResponse.status === 200) {
      const cookies = loginResponse.headers['set-cookie'];
      const cookieString = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '';
      
      // Test waiting services API
      const servicesResponse = await axios.get(`${BASE_URL}/api/admin/services/waiting-for-parts`, {
        headers: { Cookie: cookieString },
        withCredentials: true,
        validateStatus: () => true
      });
      
      console.log('Services response:', servicesResponse.status);
      console.log('Services data:', servicesResponse.data);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAPI();