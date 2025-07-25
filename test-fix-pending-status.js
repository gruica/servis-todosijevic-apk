// Test za ispravljanje pending statusa rezervnih delova
import fetch from 'node-fetch';

async function testStatusChange() {
  try {
    // 1. Login kao admin
    const authResponse = await fetch('https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    const authData = await authResponse.json();
    const token = authData.token;
    
    // 2. Mark jedan deo kao received
    const testOrderId = 38; // Koristi najnoviji order ID
    
    console.log(`🧪 Testiram mark-received funkcionalnost za order ID: ${testOrderId}`);
    
    const markResponse = await fetch(`https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/api/admin/spare-parts/${testOrderId}/mark-received`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actualCost: '75.00',
        location: 'Test Skladište A1',
        notes: 'Test prebacivanja - ispravka statusa'
      })
    });
    
    console.log(`Response status: ${markResponse.status}`);
    
    if (markResponse.status === 200) {
      const result = await markResponse.json();
      console.log('✅ Mark-received uspešan:', result);
    } else {
      const error = await markResponse.text();
      console.error('❌ Mark-received greška:', error);
    }
    
  } catch (error) {
    console.error('❌ Greška u testiranju:', error.message);
  }
}

testStatusChange();