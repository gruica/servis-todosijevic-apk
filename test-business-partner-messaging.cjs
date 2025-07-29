const fetch = require('node-fetch');

const ROBERTO_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjE5LCJ1c2VybmFtZSI6InJvYmVydC5pdmV6aWNAdGVobm9wbHVzLm1lIiwicm9sZSI6ImJ1c2luZXNzX3BhcnRuZXIiLCJpYXQiOjE3NTM3ODYyOTgsImV4cCI6MTc1NjM3ODI5OH0.RcB_JxzkG0gzOr7rhcNOsLSNCCNrusNRmByNXLo7tX8';
const ADMIN_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEwLCJ1c2VybmFtZSI6ImplbGVuYUBmcmlnb3Npc3RlbXRvZG9zaWpldmljLm1lIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzUzNzg2MjkxLCJleHAiOjE3NTYzNzgyOTF9.vSLbX5mzRwWCar19joEZxDzr-PdebNCkEECKqQ-rY4A';
const BASE_URL = 'https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev';

async function testBusinessPartnerMessaging() {
  console.log('🧪 Testiranje Business Partner Messaging Sistema...\n');

  try {
    // Test 1: Business partner šalje poruku administratoru
    console.log('Test 1: Business partner šalje poruku administratoru');
    const sendMessageResponse = await fetch(`${BASE_URL}/api/business/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ROBERTO_JWT}`
      },
      body: JSON.stringify({
        subject: "Test komunikacija sa administratorom",
        content: "Poštovani, testiram da li mogu da šaljem poruku administratoru kroz aplikaciju. Molim vas da mi potvrdite prijem ove poruke.",
        messageType: "inquiry",
        messagePriority: "normal"
      })
    });

    console.log('Response status:', sendMessageResponse.status);
    console.log('Response headers:', Object.fromEntries(sendMessageResponse.headers.entries()));
    
    if (sendMessageResponse.ok) {
      const messageData = await sendMessageResponse.json();
      console.log('✅ Poruka uspešno poslata:', messageData);
    } else {
      const error = await sendMessageResponse.text();
      console.log('❌ Greška pri slanju poruke:', sendMessageResponse.status);
      console.log('Response body preview:', error.substring(0, 200));
    }

    // Test 2: Admin čita poruke od business partnera  
    console.log('\nTest 2: Admin čita poruke od business partnera');
    const getMessagesResponse = await fetch(`${BASE_URL}/api/admin/business-partner-messages`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ADMIN_JWT}`
      }
    });

    if (getMessagesResponse.ok) {
      const messages = await getMessagesResponse.json();
      console.log(`✅ Admin pristup porukama: ${messages.length} poruka dostupna`);
      if (messages.length > 0) {
        console.log('Poslednja poruka:', {
          id: messages[0].id,
          subject: messages[0].subject,
          senderName: messages[0].senderName,
          status: messages[0].status
        });
      }
    } else {
      const error = await getMessagesResponse.text();
      console.log('❌ Greška pri čitanju poruka:', getMessagesResponse.status, error);
    }

    // Test 3: Business partner čita svoje poruke
    console.log('\nTest 3: Business partner čita svoje poruke');
    const partnerMessagesResponse = await fetch(`${BASE_URL}/api/business/messages`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ROBERTO_JWT}`
      }
    });

    if (partnerMessagesResponse.ok) {
      const partnerMessages = await partnerMessagesResponse.json();
      console.log(`✅ Business partner pristup porukama: ${partnerMessages.length} poruka dostupna`);
    } else {
      const error = await partnerMessagesResponse.text();
      console.log('❌ Greška pri čitanju partner poruka:', partnerMessagesResponse.status, error);
    }

  } catch (error) {
    console.error('❌ Greška u testu:', error.message);
  }
}

testBusinessPartnerMessaging();