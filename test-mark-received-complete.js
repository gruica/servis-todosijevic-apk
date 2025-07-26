// Kompletni test za prebacivanje rezervnih delova iz pending u available sa servisnim informacijama
import axios from 'axios';

const BASE_URL = 'https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEwLCJ1c2VybmFtZSI6ImplbGVuYUBmcmlnb3Npc3RlbXRvZG9zaWpldmljLm1lIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzUzNTExODI0LCJleHAiOjE3NTYxMDM4MjR9.gEJCJPe6q5K4q38FgWOjiXL1OgK12vEGRfFwRmbBskI';

async function testCompleteWorkflow() {
  const headers = {
    'Authorization': `Bearer ${JWT_TOKEN}`,
    'Content-Type': 'application/json'
  };

  try {
    console.log('🔍 Dohvatanje pending rezervnih delova...');
    
    // 1. Dobij pending rezervne delove
    const pendingResponse = await axios.get(`${BASE_URL}/api/admin/spare-parts/pending`, { headers });
    const pendingParts = pendingResponse.data;
    
    console.log(`📋 Pronađeno ${pendingParts.length} pending delova`);
    
    if (pendingParts.length === 0) {
      console.log('❌ Nema pending delova za testiranje');
      return;
    }
    
    // Uzmi prvi deo sa serviceId
    const testPart = pendingParts.find(part => part.serviceId);
    if (!testPart) {
      console.log('❌ Nema delova sa serviceId za testiranje');
      return;
    }
    
    console.log('📦 Testiram sa delom:', {
      id: testPart.id,
      partName: testPart.partName,
      serviceId: testPart.serviceId,
      technicianId: testPart.technicianId,
      applianceId: testPart.applianceId
    });
    
    // 2. Dobij broj available delova pre
    const availableBeforeResponse = await axios.get(`${BASE_URL}/api/admin/available-parts`, { headers });
    const availableCountBefore = availableBeforeResponse.data.length;
    console.log(`📊 Broj available delova pre: ${availableCountBefore}`);
    
    // 3. Označi kao primljen
    console.log('✅ Označavam deo kao primljen...');
    const markReceivedData = {
      actualCost: 150.50,
      location: 'Glavno skladište',
      notes: `Test prebacivanja dela #${testPart.id} sa kompletnim servisnim informacijama`
    };
    
    const markResponse = await axios.post(
      `${BASE_URL}/api/admin/spare-parts/${testPart.id}/mark-received`,
      markReceivedData,
      { headers }
    );
    
    console.log('✅ Mark-received odgovor:', markResponse.data);
    
    // 4. Proveri da li je deo uklonjen iz pending
    console.log('🔍 Proveravam pending delove posle...');
    const pendingAfterResponse = await axios.get(`${BASE_URL}/api/admin/spare-parts/pending`, { headers });
    const pendingAfter = pendingAfterResponse.data;
    const stillPending = pendingAfter.find(part => part.id === testPart.id);
    
    if (stillPending) {
      console.log('❌ Deo je još uvek u pending listi!');
    } else {
      console.log('✅ Deo je uspešno uklonjen iz pending liste');
    }
    
    // 5. Proveri available delove posle
    console.log('📦 Proveravam available delove posle...');
    const availableAfterResponse = await axios.get(`${BASE_URL}/api/admin/available-parts`, { headers });
    const availableAfter = availableAfterResponse.data;
    const availableCountAfter = availableAfter.length;
    
    console.log(`📊 Broj available delova posle: ${availableCountAfter}`);
    
    if (availableCountAfter > availableCountBefore) {
      console.log('✅ Broj available delova se povećao!');
      
      // Pronađi novi deo
      const newPart = availableAfter.find(part => part.originalOrderId === testPart.id);
      if (newPart) {
        console.log('🎯 Novi available deo sa servisnim informacijama:');
        console.log({
          id: newPart.id,
          partName: newPart.partName,
          originalOrderId: newPart.originalOrderId,
          serviceId: newPart.serviceId,
          clientName: newPart.clientName,
          clientPhone: newPart.clientPhone,
          applianceInfo: newPart.applianceInfo,
          serviceDescription: newPart.serviceDescription,
          actualCost: newPart.unitCost,
          location: newPart.location,
          notes: newPart.notes
        });
        
        // Proveri da li su svi servisni podaci popunjeni
        const hasServiceInfo = newPart.serviceId || newPart.clientName || newPart.applianceInfo;
        if (hasServiceInfo) {
          console.log('🎉 USPEH: Servisni podaci su uspešno preneseni!');
        } else {
          console.log('⚠️ UPOZORENJE: Servisni podaci nisu preneseni');
        }
      } else {
        console.log('❌ Novi deo nije pronađen u available listi');
      }
    } else {
      console.log('❌ Broj available delova se nije povećao');
    }
    
  } catch (error) {
    console.error('❌ Greška u testu:', error.response?.data || error.message);
  }
}

console.log('🚀 Pokretanje kompletnog testa prebacivanja rezervnih delova...');
testCompleteWorkflow();