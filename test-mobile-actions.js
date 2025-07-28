import jwt from 'jsonwebtoken';

// Kreira test JWT za Gruicu (technicianId: 1)
const token = jwt.sign(
  {
    id: 12,
    username: 'gruica@frigosistemtodosijevic.com', 
    role: 'technician',
    technicianId: 1
  }, 
  'frigo-sistem-jwt-secret-key-2025'
);

console.log('Test JWT za Gruicu:', token);

// Test pozivi
const baseUrl = 'https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev';

async function testMobileActions() {
  try {
    // 1. Dohvati servise za servisera
    console.log('\n=== TEST 1: Dohvatanje servisa ===');
    const servicesRes = await fetch(`${baseUrl}/api/technician/services-jwt`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const services = await servicesRes.json();
    console.log(`Pronađeno ${services.length} servisa za Gruicu`);
    
    if (services.length > 0) {
      const testService = services.find(s => ['assigned', 'in_progress', 'pending'].includes(s.status));
      if (testService) {
        console.log(`Test servis #${testService.id} - Status: ${testService.status}`);
        
        // 2. Test Start Work akcije
        console.log('\n=== TEST 2: Počni rad ===');
        const startWorkRes = await fetch(`${baseUrl}/api/services/${testService.id}/status`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'in_progress' })
        });
        
        if (startWorkRes.ok) {
          console.log('✅ Početak rada uspešno zabeležen');
        } else {
          console.log('❌ Greška pri početku rada:', await startWorkRes.text());
        }
        
        // 3. Test Request Parts akcije
        console.log('\n=== TEST 3: Poruči delove ===');
        const requestPartsRes = await fetch(`${baseUrl}/api/services/${testService.id}/status`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'waiting_parts' })
        });
        
        if (requestPartsRes.ok) {
          console.log('✅ Zahtev za delove uspešno poslat');
        } else {
          console.log('❌ Greška pri porudžbini delova:', await requestPartsRes.text());
        }
        
        // 4. Test Complete Service akcije
        console.log('\n=== TEST 4: Završi servis ===');
        const completeRes = await fetch(`${baseUrl}/api/services/${testService.id}/status`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'completed' })
        });
        
        if (completeRes.ok) {
          console.log('✅ Servis uspešno završen');
        } else {
          console.log('❌ Greška pri završetku servisa:', await completeRes.text());
        }
      } else {
        console.log('❌ Nema aktivnih servisa za testiranje');
      }
    }
  } catch (error) {
    console.error('Test greška:', error.message);
  }
}

testMobileActions();