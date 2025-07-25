// Final test za markSparePartAsReceived funkcionalnost
import fetch from 'node-fetch';

async function testMarkAsReceived() {
  try {
    console.log('🔧 FINALNI TEST REZERVNIH DELOVA - prebacivanje iz pending u dostupne');
    
    // 1. Login kao admin
    const authResponse = await fetch('https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'jelena@frigosistemtodosijevic.me', password: 'admin123' })
    });
    
    const authData = await authResponse.json();
    if (!authData.token) {
      console.error('❌ Greška pri autentifikaciji admin korisnika');
      return;
    }
    
    console.log('✅ Uspešna autentifikacija admina');
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
    
    // 3. Mark kao received
    const markReceivedResponse = await fetch(`https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/api/admin/spare-parts/${testPartId}/mark-received`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actualCost: '85.00',
        location: 'Skladište - Polica A1',
        notes: 'Finalni test prebacivanja - sve kolone dodane'
      })
    });
    
    console.log(`📡 Response status: ${markReceivedResponse.status}`);
    
    if (markReceivedResponse.status === 200) {
      const result = await markReceivedResponse.json();
      console.log('✅ USPEŠNO! Rezervni deo prebačen u dostupne delove');
      console.log(`📄 Updated Order ID: ${result.order?.id}, New Available Part ID: ${result.availablePart?.id}`);
      console.log(`💰 Cena: ${result.availablePart?.unitCost}, Lokacija: ${result.availablePart?.location}`);
    } else {
      const error = await markReceivedResponse.text();
      console.log('❌ GREŠKA pri prebacivanju:');
      console.log(error);
      return;
    }
    
    // 4. Provera dostupnih delova
    const availableResponse = await fetch('https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/api/admin/available-parts', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const availableParts = await availableResponse.json();
    console.log(`✅ Ukupno dostupnih delova nakon prebacivanja: ${availableParts.length}`);
    
    // 5. Provera pending delova (treba biti jedan manje)
    const pendingAfterResponse = await fetch('https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/api/admin/spare-parts/pending', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const pendingAfter = await pendingAfterResponse.json();
    console.log(`📋 Pending delova nakon prebacivanja: ${pendingAfter.length} (trebalo bi biti ${pendingParts.length - 1})`);
    
    if (pendingAfter.length === pendingParts.length - 1) {
      console.log('🎉 KOMPLETNO USPEŠNO! Workflow prebacivanja radi savršeno');
    } else {
      console.log('⚠️ Nešto nije u redu sa pending brojem');
    }
    
  } catch (error) {
    console.error('❌ Greška tokom finalnog testiranja:', error.message);
  }
}

testMarkAsReceived();