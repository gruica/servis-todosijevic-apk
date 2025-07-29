const https = require('https');

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEwLCJ1c2VybmFtZSI6ImplbGVuYUBmcmlnb3Npc3RlbXRvZG9zaWpldmljLm1lIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzUzNzgxMDU3LCJleHAiOjE3NTYzNzMwNTd9.bNZF3v5YI54XV3v8O3Gkli-A9BTLLLfHlLGkaRhDzrI";

const testInventoryEndpoints = async () => {
  const baseUrl = "https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev";
  
  console.log('🧪 Testiranje Professional Parts Inventory Management System...\n');
  
  const endpoints = [
    { name: 'Get All Inventory', path: '/api/admin/parts-inventory' },
    { name: 'Get Received Status', path: '/api/admin/parts-inventory/status/received' },
    { name: 'Get Main Warehouse Location', path: '/api/admin/parts-inventory/location/main_warehouse' },
    { name: 'Pending Spare Parts', path: '/api/admin/spare-parts/pending' },
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing: ${endpoint.name}`);
      
      const response = await new Promise((resolve, reject) => {
        const req = https.request(`${baseUrl}${endpoint.path}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const jsonData = JSON.parse(data);
              resolve({ status: res.statusCode, data: jsonData });
            } catch (e) {
              resolve({ status: res.statusCode, data: data });
            }
          });
        });
        
        req.on('error', reject);
        req.end();
      });
      
      if (response.status === 200) {
        console.log(`✅ ${endpoint.name}: Success (${Array.isArray(response.data) ? response.data.length : 'N/A'} items)`);
        if (Array.isArray(response.data) && response.data.length > 0) {
          console.log(`   First item: ${JSON.stringify(response.data[0]).substring(0, 150)}...`);
        }
      } else {
        console.log(`❌ ${endpoint.name}: Status ${response.status}`);
        console.log(`   Error: ${JSON.stringify(response.data).substring(0, 200)}`);
      }
      
    } catch (error) {
      console.log(`❌ ${endpoint.name}: Network Error - ${error.message}`);
    }
    
    console.log('');
  }
};

testInventoryEndpoints().catch(console.error);