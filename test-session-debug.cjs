/**
 * Test za dijagnostiku session/cookie problema
 */

const axios = require('axios');

// Kreiranje axios instance-a sa cookie podrşkom
const axiosInstance = axios.create({
  baseURL: 'http://localhost:5000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Cookie jar za manual handling
const cookieJar = {};

// Funkcija za čuvanje cookies
function saveCookies(response) {
  const cookies = response.headers['set-cookie'];
  if (cookies) {
    console.log('Received cookies:', cookies);
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
  console.log('Request headers:', config.headers);
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

async function testSession() {
  console.log('=== TEST SESSION DEBUGGING ===\n');
  
  try {
    // 1. Test registracije
    console.log('1. Registracija test korisnika...');
    const registerResponse = await axiosInstance.post('/api/register', {
      username: 'test-debug2@example.com',
      password: 'test123456',
      fullName: 'Test Debug User 2',
      email: 'test-debug2@example.com',
      role: 'business_partner',
      companyName: 'Test Company',
      phone: '+382 69 123 456',
      address: 'Test adresa',
      city: 'Podgorica'
    });
    console.log('Registracija response:', registerResponse.data);
    
    // 2. Admin login za verifikaciju
    console.log('\n2. Admin login za verifikaciju...');
    const adminLoginResponse = await axiosInstance.post('/api/login', {
      username: 'jelena@frigosistemtodosijevic.me',
      password: 'admin123'
    });
    console.log('Admin login response:', adminLoginResponse.data);
    
    // 3. Verifikacija korisnika
    console.log('\n3. Verifikacija korisnika...');
    const verifyResponse = await axiosInstance.post(`/api/users/${registerResponse.data.id}/verify`);
    console.log('Verify response:', verifyResponse.data);
    
    // 4. Admin logout
    console.log('\n4. Admin logout...');
    await axiosInstance.post('/api/logout');
    console.log('Admin logout complete');
    
    // 5. Test login-a business partner korisnika
    console.log('\n5. Business partner login test...');
    const loginResponse = await axiosInstance.post('/api/login', {
      username: 'test-debug2@example.com',
      password: 'test123456'
    });
    console.log('Login response:', loginResponse.data);
    
    // 6. Test /api/user endpoint-a
    console.log('\n6. Test /api/user...');
    const userResponse = await axiosInstance.get('/api/user');
    console.log('User response:', userResponse.data);
    
    // 7. Test business partner endpoint-a
    console.log('\n7. Test business partner endpoint...');
    try {
      const businessResponse = await axiosInstance.get('/api/business/clients');
      console.log('Business clients response:', businessResponse.data.length, 'clients');
    } catch (error) {
      console.log('Business clients error:', error.response?.data || error.message);
    }
    
    console.log('\n=== Cookie jar na kraju ===');
    console.log(cookieJar);
    
  } catch (error) {
    console.error('Error:', error.message);
    console.log('Response data:', error.response?.data);
  }
}

testSession().catch(console.error);