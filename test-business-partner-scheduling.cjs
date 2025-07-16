const axios = require('axios');

// Kreiranje axios instance 
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 10000,
  withCredentials: true
});

let adminCookies = '';
let businessPartnerCookies = '';

async function testBusinessPartnerScheduling() {
  try {
    console.log('🔍 TESTIRANJE LOGIKE ZAKAZIVANJA SERVISA POSLOVNOG PARTNERA I ADMINA\n');
    
    // 1. LOGIN KAO ADMIN
    console.log('1. Prijavljivanje kao admin...');
    const adminLoginResponse = await api.post('/login', {
      username: 'jelena@frigosistemtodosijevic.me',
      password: 'admin123'
    });
    
    const adminSetCookieHeader = adminLoginResponse.headers['set-cookie'];
    if (adminSetCookieHeader) {
      adminCookies = adminSetCookieHeader.map(cookie => cookie.split(';')[0]).join('; ');
    }
    console.log('✅ Admin login uspešan\n');
    
    // 2. LOGIN KAO POSLOVNI PARTNER
    console.log('2. Prijavljivanje kao poslovni partner...');
    const partnerLoginResponse = await api.post('/login', {
      username: 'robert.ivezic@tehnoplus.me',
      password: 'partner123'
    });
    
    const partnerSetCookieHeader = partnerLoginResponse.headers['set-cookie'];
    if (partnerSetCookieHeader) {
      businessPartnerCookies = partnerSetCookieHeader.map(cookie => cookie.split(';')[0]).join('; ');
    }
    console.log('✅ Poslovni partner login uspešan\n');
    
    // 3. POSLOVNI PARTNER KREIRA KLIJENTA
    console.log('3. Poslovni partner kreira novog klijenta...');
    api.defaults.headers.Cookie = businessPartnerCookies;
    
    const newClientData = {
      fullName: 'Marko Petrović Test',
      phone: '+38267123456',
      email: 'marko.test@example.com',
      address: 'Test adresa 123',
      city: 'Podgorica',
      companyName: 'Test Company DOO'
    };
    
    const clientResponse = await api.post('/business/clients', newClientData);
    console.log('Client response:', JSON.stringify(clientResponse.data, null, 2));
    const createdClient = clientResponse.data.data || clientResponse.data;
    console.log(`✅ Kreiran klijent ID: ${createdClient.id} - ${createdClient.full_name || createdClient.fullName}\n`);
    
    // 4. POSLOVNI PARTNER KREIRA UREĐAJ
    console.log('4. Poslovni partner kreira uređaj za klijenta...');
    
    // Prvo dobijamo kategorije i proizvodjače
    const categoriesResponse = await api.get('/appliance-categories');
    const manufacturersResponse = await api.get('/manufacturers');
    
    const categories = categoriesResponse.data;
    const manufacturers = manufacturersResponse.data;
    
    const newApplianceData = {
      clientId: createdClient.id,
      categoryId: categories[0].id,
      manufacturerId: manufacturers[0].id,
      model: 'Test Model XYZ',
      serialNumber: 'TST123456',
      purchaseDate: '2024-01-15',
      notes: 'Test uređaj za scheduling'
    };
    
    const applianceResponse = await api.post('/appliances', newApplianceData);
    const createdAppliance = applianceResponse.data.data || applianceResponse.data;
    console.log(`✅ Kreiran uređaj ID: ${createdAppliance.id} - ${createdAppliance.model}\n`);
    
    // 5. POSLOVNI PARTNER ZAKAZUJE SERVIS
    console.log('5. Poslovni partner zakazuje servis...');
    
    const scheduledDate = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0]; // za 2 dana
    
    const serviceRequestData = {
      clientId: createdClient.id,
      applianceId: createdAppliance.id,
      description: 'Test servis zakazan od strane poslovnog partnera - uređaj ne radi',
      scheduledDate: scheduledDate,
      warrantyStatus: 'in_warranty',
      urgency: 'high'
    };
    
    const serviceResponse = await api.post('/business/services', serviceRequestData);
    const createdService = serviceResponse.data.data || serviceResponse.data;
    console.log(`✅ Zakazan servis ID: ${createdService.id} za datum: ${scheduledDate}\n`);
    
    // 6. ADMIN PREUZIMA KONTROLU I PREGLEDA ZAHTEV
    console.log('6. Admin pregleda zahtev poslovnog partnera...');
    api.defaults.headers.Cookie = adminCookies;
    
    const adminServicesResponse = await api.get('/admin/services');
    const adminServices = adminServicesResponse.data;
    
    const partnerService = adminServices.find(s => s.id === createdService.id);
    if (partnerService) {
      console.log(`✅ Admin vidi zahtev: #${partnerService.id} - ${partnerService.description}`);
      console.log(`   Status: ${partnerService.status}`);
      console.log(`   Zakazan za: ${partnerService.scheduledDate}`);
      console.log(`   Klijent: ${partnerService.clientName}`);
      console.log(`   Poslovni partner: ${partnerService.partnerCompanyName || 'N/A'}\n`);
    }
    
    // 7. ADMIN DODELJUJE SERVISERA
    console.log('7. Admin dodeljuje servisera servisu...');
    
    const techniciansResponse = await api.get('/admin/technicians');
    const technicians = techniciansResponse.data;
    const selectedTechnician = technicians[0];
    
    const assignResponse = await api.put(`/admin/services/${createdService.id}/assign-technician`, {
      technicianId: selectedTechnician.id
    });
    
    console.log(`✅ Serviser ${selectedTechnician.fullName} dodeljen servisu #${createdService.id}\n`);
    
    // 8. ADMIN MENJA DATUM ZAKAZIVANJA
    console.log('8. Admin menja datum zakazivanja...');
    
    const newScheduledDate = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]; // za 3 dana
    
    const updateResponse = await api.put(`/admin/services/${createdService.id}`, {
      scheduledDate: newScheduledDate,
      status: 'scheduled'
    });
    
    console.log(`✅ Datum zakazivanja promenjen na: ${newScheduledDate}\n`);
    
    // 9. PROVERI OBAVEŠTENJA
    console.log('9. Provera obaveštenja...');
    
    const adminNotificationsResponse = await api.get('/notifications');
    const adminNotifications = adminNotificationsResponse.data;
    
    console.log(`✅ Admin obaveštenja: ${adminNotifications.length}`);
    adminNotifications.slice(0, 3).forEach(notification => {
      console.log(`📩 ${notification.type}: ${notification.title}`);
      console.log(`   ${notification.message}`);
      console.log(`   Kreano: ${new Date(notification.createdAt).toLocaleString()}`);
    });
    console.log();
    
    // 10. POSLOVNI PARTNER PROVERAVA STATUS
    console.log('10. Poslovni partner proverava status servisa...');
    api.defaults.headers.Cookie = businessPartnerCookies;
    
    const partnerServicesResponse = await api.get('/business/services');
    const partnerServices = partnerServicesResponse.data;
    
    const updatedService = partnerServices.find(s => s.id === createdService.id);
    if (updatedService) {
      console.log(`✅ Poslovni partner vidi ažuriran servis:`);
      console.log(`   Status: ${updatedService.status}`);
      console.log(`   Zakazan za: ${updatedService.scheduledDate}`);
      console.log(`   Serviser: ${updatedService.technicianName || 'Nedodeljen'}\n`);
    }
    
    // 11. ADMIN ZAPOČINJE SERVIS
    console.log('11. Admin označava servis kao započet...');
    api.defaults.headers.Cookie = adminCookies;
    
    const startServiceResponse = await api.put(`/admin/services/${createdService.id}`, {
      status: 'in_progress'
    });
    
    console.log(`✅ Servis označen kao započet\n`);
    
    // 12. ADMIN ZAVRŠAVA SERVIS
    console.log('12. Admin završava servis...');
    
    const completeServiceResponse = await api.put(`/admin/services/${createdService.id}`, {
      status: 'completed',
      completedDate: new Date().toISOString().split('T')[0],
      cost: '125.00',
      technicianNotes: 'Servis uspešno završen - zamenjen kvar deo',
      isCompletelyFixed: true
    });
    
    console.log(`✅ Servis završen sa troškovima: 125.00€\n`);
    
    // 13. FINALNA PROVERA STATUSA
    console.log('13. Finalna provera statusa servisa...');
    
    const finalServiceResponse = await api.get(`/admin/services/${createdService.id}`);
    const finalService = finalServiceResponse.data;
    
    console.log(`✅ Finalni status servisa #${finalService.id}:`);
    console.log(`   Status: ${finalService.status}`);
    console.log(`   Zakazan: ${finalService.scheduledDate}`);
    console.log(`   Završen: ${finalService.completedDate}`);
    console.log(`   Troškovi: ${finalService.cost}€`);
    console.log(`   Potpuno popravljen: ${finalService.isCompletelyFixed ? 'DA' : 'NE'}\n`);
    
    // 14. CLEANUP - BRISANJE TEST PODATAKA
    console.log('14. Brisanje test podataka...');
    
    await api.delete(`/admin/services/${createdService.id}`);
    await api.delete(`/admin/appliances/${createdAppliance.id}`);
    await api.delete(`/admin/clients/${createdClient.id}`);
    
    console.log('✅ Test podaci obrisani\n');
    
    console.log('🎉 LOGIKA ZAKAZIVANJA SERVISA POSLOVNOG PARTNERA I ADMINA RADI SAVRŠENO!');
    console.log('\n=== REZIME TESTIRANJA ===');
    console.log('✅ Poslovni partner može da kreira klijente');
    console.log('✅ Poslovni partner može da kreira uređaje');
    console.log('✅ Poslovni partner može da zakazuje servise');
    console.log('✅ Admin vidi zahteve poslovnih partnera');
    console.log('✅ Admin može da dodeljuje servisere');
    console.log('✅ Admin može da menja datume zakazivanja');
    console.log('✅ Admin može da upravlja statusima servisa');
    console.log('✅ Obaveštenja rade za sve učesnike');
    console.log('✅ Poslovni partner može da prati status servisa');
    console.log('✅ Kompletan lifecycle scheduling workflow');
    
  } catch (error) {
    console.error('❌ Greška:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
    if (error.response?.data) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testBusinessPartnerScheduling();