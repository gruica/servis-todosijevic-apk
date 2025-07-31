// Browser Console Test Script za Admin Spare Parts
// Kopirajte ovaj kod u browser console (F12) na /admin/spare-parts stranici

console.log('🔧 BROWSER CONSOLE TEST - ADMIN SPARE PARTS');

// Test 1: Proverava da li auth token postoji
const authToken = localStorage.getItem('auth_token');
console.log('1. AUTH TOKEN CHECK:');
console.log(`   Token exists: ${authToken ? '✅ YES' : '❌ NO'}`);
if (authToken) {
  console.log(`   Token length: ${authToken.length} characters`);
  console.log(`   Token starts with: ${authToken.substring(0, 20)}...`);
}

// Test 2: Direktan API poziv sa test podacima
const testData = {
  serviceId: null,
  brand: 'beko',
  deviceModel: 'WMB 71643 PTE',
  productCode: '481281729632',
  applianceCategory: 'Mašina za veš',
  partName: 'Pumpa za vodu',
  quantity: 1,
  description: 'Browser console test',
  warrantyStatus: 'u garanciji',
  urgency: 'normal',
  emailTarget: 'servis@eurotehnikamn.me'
};

console.log('2. TEST DATA:');
console.log(testData);

// Test 3: Direktan fetch poziv
if (authToken) {
  console.log('3. EXECUTING DIRECT API CALL...');
  
  fetch('/api/admin/spare-parts/order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify(testData)
  })
  .then(response => {
    console.log('✅ RESPONSE RECEIVED:');
    console.log(`   Status: ${response.status} ${response.statusText}`);
    return response.json();
  })
  .then(data => {
    console.log('✅ RESPONSE DATA:');
    console.log(data);
  })
  .catch(error => {
    console.log('❌ ERROR:');
    console.log(error);
  });
} else {
  console.log('❌ Cannot test API call - no auth token found');
}

console.log('\n🎯 INSTRUKCIJE:');
console.log('1. Kopirajte ovaj kod u browser console');
console.log('2. Pritisnite Enter');
console.log('3. Proverite rezultate');
console.log('4. Pošaljite rezultate developeru');