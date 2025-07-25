// Test script za testiranje rezervnih delova funkcionalnosti
import fetch from 'node-fetch';

async function testMarkAsReceived() {
  try {
    console.log('🔧 TESTIRANJE REZERVNIH DELOVA - prebacivanje iz pending u dostupne');
    
    // 1. Kreiranje admin JWT tokena
    const authResponse = await fetch('https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    const authData = await authResponse.json();
    if (!authData.token) {
      console.error('❌ Greška pri autentifikaciji');
      return;
    }
    
    console.log('✅ Uspešno autentifikovan admin korisnik');
    const token = authData.token;
    
    // 2. Dohvatanje pending rezervnih delova
    const pendingResponse = await fetch('https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/api/admin/spare-parts/pending', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const pendingParts = await pendingResponse.json();
    console.log(`📦 Pronađeno ${pendingParts.length} pending rezervnih delova`);
    
    if (pendingParts.length === 0) {
      console.log('⚠️ Nema pending rezervnih delova za testiranje');
      return;
    }
    
    const testPartId = pendingParts[0].id;
    console.log(`🎯 Testiram sa rezervnim delom ID: ${testPartId} - ${pendingParts[0].partName}`);
    
    // 3. Testiranje mark-received endpoint-a
    const markReceivedResponse = await fetch(`https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/api/admin/spare-parts/${testPartId}/mark-received`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actualCost: '75.50',
        location: 'Glavno skladište - test',
        notes: 'Test prebacivanja iz dijela trebovanja u dostupne delove'
      })
    });
    
    console.log(`📡 Status response: ${markReceivedResponse.status}`);
    
    if (markReceivedResponse.status === 200) {
      const result = await markReceivedResponse.json();
      console.log('✅ USPEŠNO! Rezervni deo prebačen u dostupne delove');
      console.log(`📄 Order ID: ${result.order?.id}, Available Part ID: ${result.availablePart?.id}`);
    } else {
      const error = await markReceivedResponse.text();
      console.log('❌ GREŠKA pri prebacivanju:');
      console.log(error);
    }
    
    // 4. Proverava dostupne delove
    const availableResponse = await fetch('https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/api/admin/available-parts', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const availableParts = await availableResponse.json();
    console.log(`✅ Dostupni delovi nakon prebacivanja: ${availableParts.length}`);
    
  } catch (error) {
    console.error('❌ Greška tokom testiranja:', error.message);
  }
}

testMarkAsReceived();