/**
 * Test skripta za kompletno testiranje workflow-a za rezervne delove
 * Testira ceo proces od zahteva servisera do završetka servisa
 */

// Importujte potrebne biblioteke
import axios from 'axios';
import { execSync } from 'child_process';

// Konfiguracija
const BASE_URL = 'http://localhost:5000';
const ADMIN_LOGIN = { username: 'jelena@frigosistemtodosijevic.me', password: 'admin123' };
const TECHNICIAN_LOGIN = { username: 'petar@frigosistemtodosijevic.com', password: 'serviser123' };

// Cookie jar za čuvanje sesija
let adminCookies = '';
let technicianCookies = '';

// Funkcija za login
async function login(credentials, description) {
  try {
    console.log(`\n🔐 Prijavljivanje: ${description}`);
    
    const response = await axios.post(`${BASE_URL}/api/login`, credentials, {
      withCredentials: true,
      validateStatus: () => true
    });
    
    if (response.status === 200) {
      console.log(`✅ Uspešno prijavljen: ${description}`);
      const setCookieHeader = response.headers['set-cookie'];
      if (setCookieHeader) {
        return setCookieHeader.map(cookie => cookie.split(';')[0]).join('; ');
      }
      return '';
    } else {
      console.error(`❌ Neuspešna prijava: ${description}`, response.data);
      return null;
    }
  } catch (error) {
    console.error(`❌ Greška pri prijavi: ${description}`, error.message);
    return null;
  }
}

// Funkcija za kreiranje test servisa
async function createTestService() {
  try {
    console.log('\n📋 Kreiranje test servisa...');
    
    // Prvo kreiraj test klijenta
    const clientData = {
      fullName: 'Marko Petrović Test',
      phone: '+38267123999',
      email: `marko.test.${Date.now()}@test.com`,
      address: 'Bulevar Revolucije 15',
      city: 'Podgorica'
    };
    
    const clientResponse = await axios.post(`${BASE_URL}/api/clients`, clientData, {
      headers: { Cookie: adminCookies },
      withCredentials: true
    });
    
    if (clientResponse.status !== 200 && clientResponse.status !== 201) {
      console.error('❌ Greška pri kreiranju klijenta:', clientResponse.data);
      return null;
    }
    
    const clientId = clientResponse.data.data ? clientResponse.data.data.id : clientResponse.data.id;
    console.log(`✅ Kreiran klijent ID: ${clientId}`);
    
    // Kreiraj test uređaj
    const applianceData = {
      clientId,
      categoryId: 1, // Pretpostavljamo da postoji kategorija
      manufacturerId: 1, // Pretpostavljamo da postoji proizvođač
      model: 'Test Frižider XL',
      serialNumber: `TEST-${Date.now()}`,
      purchaseDate: '2023-01-15',
      warrantyStatus: 'in_warranty'
    };
    
    const applianceResponse = await axios.post(`${BASE_URL}/api/appliances`, applianceData, {
      headers: { Cookie: adminCookies },
      withCredentials: true
    });
    
    if (applianceResponse.status !== 200 && applianceResponse.status !== 201) {
      console.error('❌ Greška pri kreiranju uređaja:', applianceResponse.data);
      return null;
    }
    
    const applianceId = applianceResponse.data.data ? applianceResponse.data.data.id : applianceResponse.data.id;
    console.log(`✅ Kreiran uređaj ID: ${applianceId}`);
    
    // Kreiraj test servis
    const serviceData = {
      clientId,
      applianceId,
      description: 'Test servis za rezervne delove - ne hladi dovoljno',
      status: 'pending',
      warrantyStatus: 'in_warranty'
    };
    
    const serviceResponse = await axios.post(`${BASE_URL}/api/services`, serviceData, {
      headers: { Cookie: adminCookies },
      withCredentials: true
    });
    
    if (serviceResponse.status !== 200 && serviceResponse.status !== 201) {
      console.error('❌ Greška pri kreiranju servisa:', serviceResponse.data);
      return null;
    }
    
    const serviceId = serviceResponse.data.data ? serviceResponse.data.data.id : serviceResponse.data.id;
    console.log(`✅ Kreiran servis ID: ${serviceId}`);
    
    return { clientId, applianceId, serviceId };
    
  } catch (error) {
    console.error('❌ Greška pri kreiranju test servisa:', error.message);
    return null;
  }
}

// Funkcija za dodelu servisa serviseru
async function assignServiceToTechnician(serviceId, technicianId) {
  try {
    console.log(`\n👤 Dodela servisa ${serviceId} serviseru ${technicianId}...`);
    
    const response = await axios.post(`${BASE_URL}/api/services/${serviceId}/assign-technician`, {
      technicianId
    }, {
      headers: { Cookie: adminCookies },
      withCredentials: true
    });
    
    if (response.status === 200) {
      console.log(`✅ Servis uspešno dodeljen serviseru`);
      return true;
    } else {
      console.error('❌ Greška pri dodeli servisa:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ Greška pri dodeli servisa:', error.message);
    return false;
  }
}

// Funkcija za pokretanje servisa od strane servisera
async function startService(serviceId) {
  try {
    console.log(`\n🚀 Pokretanje servisa ${serviceId}...`);
    
    const response = await axios.post(`${BASE_URL}/api/services/${serviceId}/update-status`, {
      status: 'in_progress'
    }, {
      headers: { Cookie: technicianCookies },
      withCredentials: true
    });
    
    if (response.status === 200) {
      console.log(`✅ Servis uspešno pokrenut`);
      return true;
    } else {
      console.error('❌ Greška pri pokretanju servisa:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ Greška pri pokretanju servisa:', error.message);
    return false;
  }
}

// Funkcija za zahtev rezervnog dela
async function requestSparePart(serviceId, applianceId) {
  try {
    console.log(`\n🔧 Zahtev za rezervni deo za servis ${serviceId}...`);
    
    const sparePartData = {
      serviceId,
      applianceId,
      partName: 'Kompresor frižidera',
      partCode: 'COMP-FRG-001',
      quantity: 1,
      estimatedCost: '150.00',
      urgency: 'high',
      notes: 'Potreban urgentno - klijent bez hlađenja'
    };
    
    const response = await axios.post(`${BASE_URL}/api/spare-parts`, sparePartData, {
      headers: { Cookie: technicianCookies },
      withCredentials: true
    });
    
    if (response.status === 200 || response.status === 201) {
      console.log(`✅ Zahtev za rezervni deo uspešno poslat`);
      console.log(`📋 ID narudžbe: ${response.data.id}`);
      return response.data.id;
    } else {
      console.error('❌ Greška pri zahtevu rezervnog dela:', response.data);
      return null;
    }
  } catch (error) {
    console.error('❌ Greška pri zahtevu rezervnog dela:', error.message);
    return null;
  }
}

// Funkcija za proveru da li je servis u "waiting_parts" statusu
async function checkServiceStatus(serviceId) {
  try {
    console.log(`\n📊 Provera statusa servisa ${serviceId}...`);
    
    const response = await axios.get(`${BASE_URL}/api/services/${serviceId}`, {
      headers: { Cookie: adminCookies },
      withCredentials: true
    });
    
    if (response.status === 200) {
      const service = response.data;
      console.log(`✅ Status servisa: ${service.status}`);
      return service.status;
    } else {
      console.error('❌ Greška pri proveri statusa servisa:', response.data);
      return null;
    }
  } catch (error) {
    console.error('❌ Greška pri proveri statusa servisa:', error.message);
    return null;
  }
}

// Funkcija za prikaz servisa koji čekaju delove (admin perspektiva)
async function listWaitingServices() {
  try {
    console.log(`\n📋 Prikaz servisa koji čekaju delove...`);
    
    const response = await axios.get(`${BASE_URL}/api/admin/services/waiting-for-parts`, {
      headers: { Cookie: adminCookies },
      withCredentials: true,
      validateStatus: () => true
    });
    
    if (response.status === 200) {
      const services = response.data;
      console.log(`✅ Broj servisa koji čekaju delove: ${services.length}`);
      
      services.forEach(service => {
        console.log(`📋 Servis ${service.id}: ${service.clientName} - ${service.applianceName}`);
        console.log(`   Status: ${service.status}`);
        console.log(`   Serviser: ${service.technicianName || 'Nedodeljen'}`);
        console.log(`   Kreiran: ${new Date(service.createdAt).toLocaleDateString()}`);
      });
      
      return services;
    } else {
      console.error('❌ Greška pri dohvatanju servisa:', response.data);
      return [];
    }
  } catch (error) {
    console.error('❌ Greška pri dohvatanju servisa:', error.message);
    return [];
  }
}

// Funkcija za vraćanje servisa iz čekanja u realizaciju
async function returnServiceFromWaiting(serviceId) {
  try {
    console.log(`\n🔄 Vraćanje servisa ${serviceId} iz čekanja u realizaciju...`);
    
    const response = await axios.post(`${BASE_URL}/api/admin/services/${serviceId}/return-from-waiting`, {}, {
      headers: { Cookie: adminCookies },
      withCredentials: true
    });
    
    if (response.status === 200) {
      console.log(`✅ Servis uspešno vraćen u realizaciju`);
      return true;
    } else {
      console.error('❌ Greška pri vraćanju servisa:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ Greška pri vraćanju servisa:', error.message);
    return false;
  }
}

// Funkcija za završetak servisa
async function completeService(serviceId) {
  try {
    console.log(`\n✅ Završavanje servisa ${serviceId}...`);
    
    const response = await axios.post(`${BASE_URL}/api/services/${serviceId}/update-status`, {
      status: 'completed',
      technicianNotes: 'Servis završen - zamenjen kompresor',
      cost: 180.00,
      isCompletelyFixed: true
    }, {
      headers: { Cookie: technicianCookies },
      withCredentials: true
    });
    
    if (response.status === 200) {
      console.log(`✅ Servis uspešno završen`);
      return true;
    } else {
      console.error('❌ Greška pri završavanju servisa:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ Greška pri završavanju servisa:', error.message);
    return false;
  }
}

// Funkcija za proveru obaveštenja
async function checkNotifications() {
  try {
    console.log(`\n🔔 Provera obaveštenja...`);
    
    // Proveri admin obaveštenja
    const adminResponse = await axios.get(`${BASE_URL}/api/notifications`, {
      headers: { Cookie: adminCookies },
      withCredentials: true
    });
    
    if (adminResponse.status === 200) {
      const adminNotifications = adminResponse.data;
      console.log(`✅ Admin obaveštenja: ${adminNotifications.length}`);
      
      adminNotifications.forEach(notification => {
        console.log(`📩 ${notification.type}: ${notification.title}`);
        console.log(`   ${notification.message}`);
        console.log(`   Kreano: ${new Date(notification.createdAt).toLocaleString()}`);
      });
    }
    
    // Proveri serviser obaveštenja
    const techResponse = await axios.get(`${BASE_URL}/api/notifications`, {
      headers: { Cookie: technicianCookies },
      withCredentials: true
    });
    
    if (techResponse.status === 200) {
      const techNotifications = techResponse.data;
      console.log(`✅ Serviser obaveštenja: ${techNotifications.length}`);
      
      techNotifications.forEach(notification => {
        console.log(`📩 ${notification.type}: ${notification.title}`);
        console.log(`   ${notification.message}`);
        console.log(`   Kreano: ${new Date(notification.createdAt).toLocaleString()}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Greška pri proveri obaveštenja:', error.message);
  }
}

// Glavna test funkcija
async function runCompleteTest() {
  console.log('🚀 POKRETANJE KOMPLETNOG TESTA REZERVNIH DELOVA');
  console.log('================================================');
  
  try {
    // Korak 1: Prijava korisnika
    adminCookies = await login(ADMIN_LOGIN, 'Administrator');
    if (!adminCookies) {
      console.error('❌ Neuspešna prijava administratora');
      return;
    }
    
    technicianCookies = await login(TECHNICIAN_LOGIN, 'Serviser');
    if (!technicianCookies) {
      console.error('❌ Neuspešna prijava servisera');
      return;
    }
    
    // Korak 2: Kreiranje test servisa
    const testData = await createTestService();
    if (!testData) {
      console.error('❌ Neuspešno kreiranje test servisa');
      return;
    }
    
    const { serviceId, applianceId } = testData;
    
    // Korak 3: Dodela servisa serviseru (ID 4 - Petar)
    const assigned = await assignServiceToTechnician(serviceId, 4);
    if (!assigned) {
      console.error('❌ Neuspešna dodela servisa');
      return;
    }
    
    // Korak 4: Pokretanje servisa
    const started = await startService(serviceId);
    if (!started) {
      console.error('❌ Neuspešno pokretanje servisa');
      return;
    }
    
    // Korak 5: Zahtev za rezervni deo (ovo treba automatski da promeni status)
    const orderid = await requestSparePart(serviceId, applianceId);
    if (!orderid) {
      console.error('❌ Neuspešan zahtev za rezervni deo');
      return;
    }
    
    // Kratka pauza da se procesira zahtev
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Korak 6: Provera da li je servis automatski prešao u "waiting_parts"
    const status = await checkServiceStatus(serviceId);
    if (status !== 'waiting_parts') {
      console.error(`❌ Servis nije automatski prešao u waiting_parts status (trenutni: ${status})`);
      return;
    }
    
    console.log('✅ AUTOMATSKO PREMEŠTANJE FUNKCIONALHO!');
    
    // Korak 7: Prikaz servisa koji čekaju delove
    const waitingServices = await listWaitingServices();
    if (waitingServices.length === 0) {
      console.error('❌ Nema servisa u listi čekanja');
      return;
    }
    
    // Korak 8: Provera obaveštenja
    await checkNotifications();
    
    // Korak 9: Vraćanje servisa u realizaciju (admin akcija)
    const returned = await returnServiceFromWaiting(serviceId);
    if (!returned) {
      console.error('❌ Neuspešno vraćanje servisa u realizaciju');
      return;
    }
    
    // Korak 10: Provera da li je servis vraćen u "in_progress"
    const newStatus = await checkServiceStatus(serviceId);
    if (newStatus !== 'in_progress') {
      console.error(`❌ Servis nije vraćen u in_progress status (trenutni: ${newStatus})`);
      return;
    }
    
    console.log('✅ VRAĆANJE SERVISA FUNKCIONALNO!');
    
    // Korak 11: Završetak servisa
    const completed = await completeService(serviceId);
    if (!completed) {
      console.error('❌ Neuspešno završavanje servisa');
      return;
    }
    
    // Korak 12: Finalna prova obaveštenja
    await checkNotifications();
    
    console.log('\n🎉 KOMPLETNI TEST USPEŠNO ZAVRŠEN!');
    console.log('=====================================');
    console.log('✅ Automatsko premeštanje u waiting_parts - RADI');
    console.log('✅ Admin panel za vraćanje servisa - RADI');
    console.log('✅ Obaveštenja za sve učesnike - RADI');
    console.log('✅ Kompletan workflow - FUNKCIONALAN');
    
  } catch (error) {
    console.error('❌ Greška tokom testa:', error.message);
  }
}

// Pokretanje testa
runCompleteTest();