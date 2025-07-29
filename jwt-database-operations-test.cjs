const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'frigo-sistem-jwt-secret-key-2025';

// Test database operations to verify all JWT roles can access their endpoints
async function testDatabaseOperations() {
  console.log('=== TESTIRANJE BAZE PODATAKA SA JWT TOKEN-IMA ===\n');
  
  // Test Admin users can access admin services and delete functionality
  console.log('🔐 Admin korisnici:');
  const adminToken = jwt.sign({ userId: 10, username: 'jelena@frigosistemtodosijevic.me', role: 'admin' }, JWT_SECRET);
  
  // Test service deletion (najkritičnija operacija)
  try {
    const deleteTest = await fetch('http://localhost:5000/api/admin/services/1', {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    console.log(`   DELETE service test: ${deleteTest.ok ? '✅ SUCCESS' : '❌ FAILED'} (${deleteTest.status})`);
  } catch(e) {
    console.log(`   DELETE service test: ❌ ERROR - ${e.message}`);
  }
  
  // Test ComPlus Admin
  console.log('🔐 ComPlus Admin korisnici:');
  const complusToken = jwt.sign({ userId: 43, username: 'teodora@frigosistemtodosijevic.com', role: 'complus_admin' }, JWT_SECRET);
  
  try {
    const servicesTest = await fetch('http://localhost:5000/api/admin/services', {
      headers: { 'Authorization': `Bearer ${complusToken}` }
    });
    console.log(`   ComPlus services access: ${servicesTest.ok ? '✅ SUCCESS' : '❌ FAILED'} (${servicesTest.status})`);
  } catch(e) {
    console.log(`   ComPlus services access: ❌ ERROR - ${e.message}`);
  }
  
  // Test database write operations for technicians
  console.log('🔐 Tehničar korisnici:');
  const techToken = jwt.sign({ userId: 12, username: 'gruica@frigosistemtodosijevic.com', role: 'technician' }, JWT_SECRET);
  
  try {
    const updateTest = await fetch('http://localhost:5000/api/services/1/status', {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${techToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'in_progress', notes: 'JWT test update' })
    });
    console.log(`   Service status update: ${updateTest.ok ? '✅ SUCCESS' : '❌ FAILED'} (${updateTest.status})`);
  } catch(e) {
    console.log(`   Service status update: ❌ ERROR - ${e.message}`);
  }
  
  console.log('\n=== ZAVRŠENI SVEOBUHVATAN JWT TEST ===');
}

testDatabaseOperations().catch(console.error);