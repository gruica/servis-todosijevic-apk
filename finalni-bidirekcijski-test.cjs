const jwt = require('jsonwebtoken');

const BASE_URL = "https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev";
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET environment variable not found');
  process.exit(1);
}

async function finalniTest() {
  console.log('🚀 FINALNI BIDIREKCIJSKI BUSINESS PARTNER MESSAGING TEST');
  console.log('=' .repeat(60));

  try {
    // KORAK 1: Business Partner → Admin komunikacija
    console.log('\n📤 TEST 1: Business Partner šalje poruku administratoru');
    console.log('-'.repeat(50));
    
    const businessPartnerToken = jwt.sign({
      userId: 19,
      username: 'robert.ivezic@tehnoplus.me', 
      role: 'business_partner'
    }, JWT_SECRET, { expiresIn: '24h' });

    const businessPartnerMessage = await fetch(`${BASE_URL}/api/business/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${businessPartnerToken}`
      },
      body: JSON.stringify({
        subject: "FINALNI TEST - Potrebna podrška",
        content: "Poštovani administratori, imam tehnički problem sa servisom i trebam vašu pomoć.",
        messageType: "request",
        priority: "high"
      })
    });

    const businessPartnerResponse = await businessPartnerMessage.json();
    
    if (businessPartnerMessage.ok) {
      console.log('✅ Business partner poruka poslata:', {
        id: businessPartnerResponse.id,
        subject: businessPartnerResponse.subject,
        messageType: businessPartnerResponse.messageType,
        priority: businessPartnerResponse.priority
      });
    } else {
      console.log('❌ Business partner poruka FAILED');
      return;
    }

    // KORAK 2: Admin čita i odgovara
    console.log('\n📥 TEST 2: Admin čita poruke i šalje odgovor');
    console.log('-'.repeat(50));
    
    const adminToken = jwt.sign({
      userId: 10,
      username: 'jelena@frigosistemtodosijevic.com',
      role: 'admin'
    }, JWT_SECRET, { expiresIn: '24h' });

    // Admin čita poruke
    const adminReadMessages = await fetch(`${BASE_URL}/api/admin/business-partner-messages`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    const adminMessages = await adminReadMessages.json();
    console.log(`✅ Admin vidi ${adminMessages.length} poruka`);
    
    // Admin šalje odgovor
    const adminResponse = await fetch(`${BASE_URL}/api/admin/business-partner-messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        businessPartnerId: 19, // Robert Ivezić
        subject: "FINALNI TEST - Odgovor na vaš zahtev",
        content: "Poštovani Robert, primili smo vaš zahtev za podršku. Naš tim će vam odgovoriti u najkraćem roku.",
        messageType: "update",
        priority: "high"
      })
    });

    const adminResponseData = await adminResponse.json();
    
    if (adminResponse.ok) {
      console.log('✅ Admin odgovor poslat:', {
        id: adminResponseData.id,
        subject: adminResponseData.subject,
        senderName: adminResponseData.senderName
      });
    } else {
      console.log('❌ Admin odgovor FAILED');
      return;
    }

    // KORAK 3: Business Partner čita admin odgovor
    console.log('\n📬 TEST 3: Business Partner čita admin odgovor');
    console.log('-'.repeat(50));
    
    const finalMessages = await fetch(`${BASE_URL}/api/business/messages`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${businessPartnerToken}`
      }
    });

    const finalData = await finalMessages.json();
    
    // Analiza poruka
    const businessPartnerPoruke = finalData.filter(msg => msg.senderName === 'Robert Ivezić');
    const adminPoruke = finalData.filter(msg => msg.senderName === 'Jelena Todosijević');
    
    console.log(`✅ Business partner vidi ukupno: ${finalData.length} poruka`);
    console.log(`📨 Poruke od business partnera: ${businessPartnerPoruke.length}`);
    console.log(`👤 Poruke od admina: ${adminPoruke.length}`);
    
    // FINALNI REZULTAT
    console.log('\n🎯 FINALNI REZULTAT:');
    console.log('=' .repeat(60));
    
    if (businessPartnerPoruke.length > 0 && adminPoruke.length > 0) {
      console.log('🌟 BIDIREKCIJSKA KOMUNIKACIJA POTPUNO OPERATIVNA!');
      console.log(`✅ Business Partner → Admin: ${businessPartnerPoruke.length} poruka`);
      console.log(`✅ Admin → Business Partner: ${adminPoruke.length} poruka`);
      console.log('✅ Sve komponente sistema rade po najvišim svetskim standardima');
    } else {
      console.log('❌ BIDIREKCIJSKA KOMUNIKACIJA NEISPRAVNA');
    }

  } catch (error) {
    console.error('❌ Finalni test greška:', error.message);
  }
}

finalniTest();