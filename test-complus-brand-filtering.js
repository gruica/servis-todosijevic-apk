import axios from 'axios';

// Test Com Plus brand filtering functionality
async function testComplusBrandFiltering() {
  const baseURL = 'https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev';
  
  console.log('🧪 TESTING COM PLUS BRAND FILTERING SYSTEM');
  console.log('==========================================');
  
  try {
    // 1. Login as Teodora (Com Plus admin)
    console.log('\n1. Logging in as Teodora (Com Plus admin)...');
    const loginResponse = await axios.post(`${baseURL}/api/jwt-login`, {
      username: 'teodora@frigosistemtodosijevic.com',
      password: 'Teodora123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    console.log(`   Token received: ${token.substring(0, 50)}...`);
    
    const headers = { Authorization: `Bearer ${token}` };
    
    // 2. Test Com Plus services endpoint
    console.log('\n2. Testing Com Plus services endpoint...');
    const servicesResponse = await axios.get(`${baseURL}/api/complus/services`, { headers });
    console.log(`✅ Services endpoint working: ${servicesResponse.data.length} Com Plus services found`);
    
    // Check if only Com Plus brands are included
    const complusBrands = ['Electrolux', 'Elica', 'Candy', 'Hoover', 'Turbo Air'];
    const nonComplusBrands = servicesResponse.data.filter(service => 
      !complusBrands.includes(service.manufacturerName)
    );
    
    if (nonComplusBrands.length === 0) {
      console.log('✅ Brand filtering working: Only Com Plus brands found');
    } else {
      console.log('❌ Brand filtering FAILED: Non-Com Plus brands found:');
      nonComplusBrands.forEach(service => {
        console.log(`   - Service #${service.id}: ${service.manufacturerName}`);
      });
    }
    
    // 3. Test Com Plus appliances endpoint
    console.log('\n3. Testing Com Plus appliances endpoint...');
    const appliancesResponse = await axios.get(`${baseURL}/api/complus/appliances`, { headers });
    
    if (Array.isArray(appliancesResponse.data)) {
      console.log(`✅ Appliances endpoint working: ${appliancesResponse.data.length} Com Plus appliances found`);
      
      // Check appliance brands
      const nonComplusAppliances = appliancesResponse.data.filter(appliance => 
        !complusBrands.includes(appliance.manufacturerName)
      );
      
      if (nonComplusAppliances.length === 0) {
        console.log('✅ Appliances filtering working: Only Com Plus brands found');
      } else {
        console.log('❌ Appliances filtering FAILED: Non-Com Plus brands found:');
        nonComplusAppliances.slice(0, 5).forEach(appliance => {
          console.log(`   - Appliance #${appliance.id}: ${appliance.manufacturerName}`);
        });
        if (nonComplusAppliances.length > 5) {
          console.log(`   ... and ${nonComplusAppliances.length - 5} more`);
        }
      }
    } else {
      console.log(`ℹ️  Appliances endpoint returned: ${appliancesResponse.data} (not an array)`);
    }
    
    // 4. Test Com Plus clients endpoint
    console.log('\n4. Testing Com Plus clients endpoint...');
    const clientsResponse = await axios.get(`${baseURL}/api/complus/clients`, { headers });
    console.log(`✅ Clients endpoint working: ${clientsResponse.data.length} Com Plus clients found`);
    
    // 5. Test Com Plus stats endpoint
    console.log('\n5. Testing Com Plus statistics endpoint...');
    const statsResponse = await axios.get(`${baseURL}/api/complus/stats`, { headers });
    console.log('✅ Statistics endpoint working');
    console.log(`   Total services: ${statsResponse.data.total}`);
    console.log(`   Active services: ${statsResponse.data.active}`);
    console.log(`   Completed this month: ${statsResponse.data.completedThisMonth}`);
    console.log(`   Warranty services: ${statsResponse.data.warranty}`);
    
    // 6. Test service update with Com Plus endpoint
    if (servicesResponse.data.length > 0) {
      console.log('\n6. Testing Com Plus service update endpoint...');
      const testService = servicesResponse.data[0];
      
      try {
        const updateResponse = await axios.put(`${baseURL}/api/complus/services/${testService.id}`, {
          description: testService.description + ' (COM PLUS TEST UPDATE)',
        }, { headers });
        
        console.log(`✅ Service update working: Service #${testService.id} updated`);
        
        // Revert the change
        await axios.put(`${baseURL}/api/complus/services/${testService.id}`, {
          description: testService.description,
        }, { headers });
        console.log('✅ Service reverted to original state');
        
      } catch (updateError) {
        console.log('❌ Service update failed:', updateError.response?.data?.error || updateError.message);
      }
    }
    
    // 7. Test access control - try to access non-Com Plus service
    console.log('\n7. Testing access control...');
    try {
      // Get all services to find a non-Com Plus service
      const allServicesResponse = await axios.get(`${baseURL}/api/admin/services`, { headers });
      const nonComplusService = allServicesResponse.data.find(service => 
        !complusBrands.includes(service.manufacturerName)
      );
      
      if (nonComplusService) {
        try {
          await axios.put(`${baseURL}/api/complus/services/${nonComplusService.id}`, {
            description: 'This should fail'
          }, { headers });
          console.log('❌ Access control FAILED: Non-Com Plus service was updated');
        } catch (accessError) {
          console.log('✅ Access control working: Non-Com Plus service update blocked');
          console.log(`   Error: ${accessError.response.data.error}`);
        }
      } else {
        console.log('ℹ️  No non-Com Plus services found to test access control');
      }
    } catch (error) {
      console.log('ℹ️  Could not test access control:', error.message);
    }
    
    console.log('\n🎉 COM PLUS BRAND FILTERING TEST COMPLETED');
    console.log('==========================================');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testComplusBrandFiltering();