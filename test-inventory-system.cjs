#!/usr/bin/env node

/**
 * Test Professional Parts Inventory Management System
 * Validates complete workflow: pending → received → allocated → dispatched → installed
 */

const axios = require('axios');

const BASE_URL = 'https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev';

// JWT token for admin authentication
const JWT_TOKEN = process.env.ADMIN_JWT_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEwLCJ1c2VybmFtZSI6ImplbGVuYUBmcmlnb3Npc3RlbXRvZG9zaWpldmljLm1lIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzUzNzc5ODUxLCJleHAiOjE3NTYzNzE4NTF9.V6AJ22kKBJ_3xzBjVVuG-yH7iP7Zw1JiQXP8Q6nU-EU';

if (!JWT_TOKEN) {
  console.error('❌ ADMIN_JWT_TOKEN environment variable is required');
  console.log('Generate a token using: node generate-jwt.js');
  process.exit(1);
}

const axiosConfig = {
  headers: {
    'Authorization': `Bearer ${JWT_TOKEN}`,
    'Content-Type': 'application/json'
  }
};

async function runInventoryTests() {
  console.log('🧪 PROFESSIONAL PARTS INVENTORY MANAGEMENT SYSTEM TEST');
  console.log('=' .repeat(70));

  try {
    // Test 1: Get all pending spare part orders
    console.log('\n1️⃣ Testing pending spare part orders...');
    const pendingResponse = await axios.get(`${BASE_URL}/api/admin/spare-parts/pending`, axiosConfig);
    console.log(`✅ Found ${pendingResponse.data.length} pending orders`);
    
    if (pendingResponse.data.length === 0) {
      console.log('⚠️ No pending orders found. Creating test order...');
      
      // Create a test spare part order
      const testOrder = {
        partName: 'Test Inventory Part',
        partNumber: 'TIP-001',
        quantity: 1,
        description: 'Test part for inventory system validation',
        urgency: 'normal',
        status: 'pending',
        warrantyStatus: 'u garanciji',
        supplierName: 'Test Supplier'
      };
      
      const createResponse = await axios.post(`${BASE_URL}/api/admin/spare-parts/order`, testOrder, axiosConfig);
      console.log(`✅ Test order created: ID ${createResponse.data.orderId}`);
      
      // Re-fetch pending orders
      const newPendingResponse = await axios.get(`${BASE_URL}/api/admin/spare-parts/pending`, axiosConfig);
      console.log(`✅ Now have ${newPendingResponse.data.length} pending orders`);
    }

    // Test 2: Get all inventory items
    console.log('\n2️⃣ Testing inventory retrieval...');
    const inventoryResponse = await axios.get(`${BASE_URL}/api/admin/parts-inventory`, axiosConfig);
    console.log(`✅ Found ${inventoryResponse.data.length} inventory items`);

    // Test 3: Test receiving parts from order (workflow: pending → received)
    console.log('\n3️⃣ Testing parts receiving workflow...');
    const pendingOrders = await axios.get(`${BASE_URL}/api/admin/spare-parts/pending`, axiosConfig);
    
    if (pendingOrders.data.length > 0) {
      const orderId = pendingOrders.data[0].id;
      console.log(`Testing with order ID: ${orderId}`);
      
      const receiveData = {
        actualCost: '15000.00',
        supplierInvoiceNumber: 'INV-TEST-001',
        warehouseLocation: 'Magacin A - Polica 1',
        batchNumber: 'BATCH-2025-001',
        receivingNotes: 'Test primanje dela - inventory sistem test'
      };
      
      try {
        const receiveResponse = await axios.post(
          `${BASE_URL}/api/admin/parts-inventory/receive/${orderId}`, 
          receiveData, 
          axiosConfig
        );
        console.log('✅ Parts successfully received into inventory:', receiveResponse.data.message);
        console.log(`   Inventory ID: ${receiveResponse.data.inventoryItem.id}`);
        console.log(`   Part Name: ${receiveResponse.data.inventoryItem.partName}`);
        console.log(`   Status: ${receiveResponse.data.inventoryItem.status}`);
        console.log(`   Location: ${receiveResponse.data.inventoryItem.currentLocation}`);
        
        const inventoryId = receiveResponse.data.inventoryItem.id;
        
        // Test 4: Test parts allocation (workflow: received → allocated)
        console.log('\n4️⃣ Testing parts allocation workflow...');
        const allocationData = {
          serviceId: 1, // Test with service ID 1
          technicianId: 1 // Test with technician ID 1
        };
        
        try {
          const allocateResponse = await axios.post(
            `${BASE_URL}/api/admin/parts-inventory/${inventoryId}/allocate`,
            allocationData,
            axiosConfig
          );
          console.log('✅ Parts successfully allocated to service:', allocateResponse.data.message);
          console.log(`   Service ID: ${allocationData.serviceId}`);
          console.log(`   Technician ID: ${allocationData.technicianId}`);
          
          // Test 5: Test parts dispatch (workflow: allocated → dispatched)
          console.log('\n5️⃣ Testing parts dispatch workflow...');
          const dispatchData = {
            dispatchNotes: 'Deo otpremljen serviseru Gruica za servis #1'
          };
          
          try {
            const dispatchResponse = await axios.post(
              `${BASE_URL}/api/admin/parts-inventory/${inventoryId}/dispatch`,
              dispatchData,
              axiosConfig
            );
            console.log('✅ Parts successfully dispatched to technician:', dispatchResponse.data.message);
            
            // Test 6: Test parts installation (workflow: dispatched → installed)
            console.log('\n6️⃣ Testing parts installation workflow...');
            const installData = {
              installationNotes: 'Deo uspešno ugrađen kod klijenta - test završen'
            };
            
            try {
              const installResponse = await axios.post(
                `${BASE_URL}/api/parts-inventory/${inventoryId}/install`,
                installData,
                axiosConfig
              );
              console.log('✅ Parts successfully installed:', installResponse.data.message);
              
              console.log('\n🎉 COMPLETE INVENTORY WORKFLOW VALIDATION SUCCESSFUL!');
              console.log('✅ Full workflow tested: pending → received → allocated → dispatched → installed');
              
            } catch (installError) {
              console.log('⚠️ Installation test failed:', installError.response?.data?.error || installError.message);
            }
            
          } catch (dispatchError) {
            console.log('⚠️ Dispatch test failed:', dispatchError.response?.data?.error || dispatchError.message);
          }
          
        } catch (allocateError) {
          console.log('⚠️ Allocation test failed:', allocateError.response?.data?.error || allocateError.message);
        }
        
      } catch (receiveError) {
        console.log('⚠️ Receiving test failed:', receiveError.response?.data?.error || receiveError.message);
      }
    } else {
      console.log('⚠️ No pending orders to test receiving workflow');
    }

    // Test 7: Test filtering and search functionality
    console.log('\n7️⃣ Testing inventory filtering and search...');
    
    // Test by status
    try {
      const receivedItems = await axios.get(`${BASE_URL}/api/admin/parts-inventory/status/received`, axiosConfig);
      console.log(`✅ Found ${receivedItems.data.length} received items`);
    } catch (error) {
      console.log('⚠️ Status filtering test failed:', error.response?.data?.error || error.message);
    }
    
    // Test by location
    try {
      const warehouseItems = await axios.get(`${BASE_URL}/api/admin/parts-inventory/location/main_warehouse`, axiosConfig);
      console.log(`✅ Found ${warehouseItems.data.length} items in main warehouse`);
    } catch (error) {
      console.log('⚠️ Location filtering test failed:', error.response?.data?.error || error.message);
    }
    
    // Test search functionality
    try {
      const searchResults = await axios.get(`${BASE_URL}/api/admin/parts-inventory/search?q=test`, axiosConfig);
      console.log(`✅ Search found ${searchResults.data.length} items matching 'test'`);
    } catch (error) {
      console.log('⚠️ Search test failed:', error.response?.data?.error || error.message);
    }

    console.log('\n🔧 PROFESSIONAL INVENTORY SYSTEM VALIDATION COMPLETE');
    console.log('=' .repeat(70));
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.log('🔑 Authentication failed. Please check JWT_TOKEN');
    }
  }
}

// Run tests
runInventoryTests().catch(console.error);