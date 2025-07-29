const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'frigo-sistem-jwt-secret-key-2025';
const BASE_URL = 'https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev';

// Generate admin JWT token
const adminToken = jwt.sign({
  userId: 10,  // Jelena admin
  username: 'jelena@frigosistemtodosijevic.me',
  role: 'admin'
}, JWT_SECRET, { expiresIn: '24h' });

async function testAdminToBusinessPartner() {
  console.log('🧪 Testiranje Admin → Business Partner poruka...\n');

  try {
    // Test: Admin šalje poruku business partneru
    console.log('Test: Admin šalje poruku business partneru (Robert Ivezić)');
    
    const sendMessageResponse = await fetch(`${BASE_URL}/api/admin/business-partner-messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        businessPartnerId: 19, // Robert Ivezić ID
        subject: "Odgovor od administratora",
        content: "Poštovani Robert, hvala vam na poruci. Primili smo vaš zahtev i uskoro ćemo vam odgovoriti sa detaljnim informacijama.",
        messageType: "update",
        priority: "normal"
      })
    });

    console.log('Response status:', sendMessageResponse.status);
    console.log('Content-Type:', sendMessageResponse.headers.get('content-type'));
    
    const responseText = await sendMessageResponse.text();
    console.log('Response preview:', responseText.substring(0, 200));
    
    if (sendMessageResponse.ok) {
      try {
        const messageData = JSON.parse(responseText);
        console.log('✅ Admin poruka uspešno poslata:', {
          id: messageData.id,
          subject: messageData.subject,
          businessPartnerId: messageData.businessPartnerId,
          senderName: messageData.senderName,
          messageType: messageData.messageType
        });
      } catch (parseError) {
        console.log('❌ JSON parsing greška:', parseError.message);
        console.log('Raw response:', responseText.substring(0, 500));
      }
    } else {
      console.log('❌ HTTP greška:', sendMessageResponse.status);
      console.log('Response:', responseText.substring(0, 300));
    }

    // Test: Proveri da li business partner može da vidi admin poruku
    console.log('\nTest: Business partner čita poruke (uključujući admin odgovor)');
    
    const businessPartnerToken = jwt.sign({
      userId: 19,
      username: 'robert.ivezic@tehnoplus.me', 
      role: 'business_partner'
    }, JWT_SECRET, { expiresIn: '24h' });

    const getMessagesResponse = await fetch(`${BASE_URL}/api/business/messages`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${businessPartnerToken}`
      }
    });

    if (getMessagesResponse.ok) {
      const messages = await getMessagesResponse.json();
      console.log(`✅ Business partner vidi ukupno: ${messages.length} poruka`);
      
      // Pronađi admin poruke (tip 'update' od administratora)
      const adminMessages = messages.filter(msg => msg.messageType === 'update');
      console.log(`📨 Admin poruke: ${adminMessages.length}`);
      
      if (adminMessages.length > 0) {
        console.log('Poslednja admin poruka:', {
          id: adminMessages[0].id,
          subject: adminMessages[0].subject,
          senderName: adminMessages[0].senderName,
          messageType: adminMessages[0].messageType
        });
      }
    } else {
      console.log('❌ Greška pri čitanju poruka:', getMessagesResponse.status);
    }

  } catch (error) {
    console.error('❌ Test greška:', error.message);
  }
}

testAdminToBusinessPartner();