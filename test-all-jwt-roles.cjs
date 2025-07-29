const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'frigo-sistem-jwt-secret-key-2025';

// Test korisnici iz različitih uloga (iz baze podataka)
const testUsers = [
  { userId: 10, username: 'jelena@frigosistemtodosijevic.me', role: 'admin', description: 'Admin - Jelena Todosijević' },
  { userId: 38, username: 'admin', role: 'admin', description: 'Admin - Administrator' },
  { userId: 2, username: 'jovan@frigosistemtodosijevic.com', role: 'technician', description: 'Tehničar - Jovan Todosijević' },
  { userId: 12, username: 'gruica@frigosistemtodosijevic.com', role: 'technician', description: 'Tehničar - Gruica Todosijević' },
  { userId: 19, username: 'robert.ivezic@tehnoplus.me', role: 'business_partner', description: 'Business Partner - Robert Ivezić' },
  { userId: 42, username: 'beli.supplier@frigosistem.me', role: 'business_partner', description: 'Business Partner - Beli Dobavljač' },
  { userId: 43, username: 'teodora@frigosistemtodosijevic.com', role: 'complus_admin', description: 'ComPlus Admin - Teodora Todosijević' },
  { userId: 40, username: 'Captin.apartments@gmail.com', role: 'customer', description: 'Klijent - JANINA RAJKOVIĆ' }
];

async function testJWTAuthentication() {
  console.log('=== TESTIRANJE JWT AUTENTIFIKACIJE ZA SVE ULOGE ===\n');
  
  for (const user of testUsers) {
    console.log(`🔐 Testiram: ${user.description} (${user.role})`);
    
    // Kreiranje JWT tokena
    const token = jwt.sign(
      { userId: user.userId, username: user.username, role: user.role },
      JWT_SECRET
    );
    
    try {
      // Test JWT user endpoint
      const userResponse = await fetch('http://localhost:5000/api/jwt-user', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        console.log(`✅ JWT user endpoint: SUCCESS - ${userData.username} (${userData.role})`);
      } else {
        const error = await userResponse.text();
        console.log(`❌ JWT user endpoint: FAILED - ${userResponse.status}: ${error}`);
        continue;
      }
      
      // Test role-specific endpoints
      if (user.role === 'admin') {
        // Test admin services endpoint
        const servicesResponse = await fetch('http://localhost:5000/api/admin/services', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`   Admin services: ${servicesResponse.ok ? '✅ SUCCESS' : '❌ FAILED'}`);
        
        // Test admin technicians endpoint
        const techResponse = await fetch('http://localhost:5000/api/technicians', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`   Admin technicians: ${techResponse.ok ? '✅ SUCCESS' : '❌ FAILED'}`);
        
      } else if (user.role === 'technician') {
        // Test technician services endpoint
        const myServicesResponse = await fetch('http://localhost:5000/api/my-services', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`   Technician services: ${myServicesResponse.ok ? '✅ SUCCESS' : '❌ FAILED'}`);
        
      } else if (user.role === 'business_partner') {
        // Test business partner services endpoint
        const bpServicesResponse = await fetch('http://localhost:5000/api/business/services-jwt', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`   Business partner services: ${bpServicesResponse.ok ? '✅ SUCCESS' : '❌ FAILED'}`);
        
      } else if (user.role === 'complus_admin') {
        // Test ComPlus admin services endpoint
        const complusResponse = await fetch('http://localhost:5000/api/admin/services', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`   ComPlus admin services: ${complusResponse.ok ? '✅ SUCCESS' : '❌ FAILED'}`);
        
      } else if (user.role === 'customer') {
        // Test customer profile endpoint (if exists)
        const profileResponse = await fetch('http://localhost:5000/api/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`   Customer profile: ${profileResponse.ok ? '✅ SUCCESS' : '❌ FAILED (možda ne postoji endpoint)'}`);
      }
      
    } catch (error) {
      console.log(`❌ Network error: ${error.message}`);
    }
    
    console.log(''); // Empty line for separation
  }
}

testJWTAuthentication().catch(console.error);