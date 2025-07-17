const axios = require('axios');
const fs = require('fs');

// Kompletan test notification sistema
async function testNotificationSystem() {
    console.log('=== FINALNI TEST NOTIFICATION SISTEMA ===');
    
    try {
        // Učitaj admin cookies
        const adminCookies = fs.readFileSync('admin_cookies.txt', 'utf8');
        
        // Kreiraj test notifikaciju
        const notificationResponse = await axios.post('http://localhost:5000/api/notifications', {
            type: 'service_assigned',
            userId: 10, // admin jelena
            message: 'FINALNI TEST - Servis #39 je dodeljen',
            relatedServiceId: 39,
            metadata: {
                serviceId: 39,
                technicianId: 1,
                assignedBy: 'admin'
            }
        }, {
            headers: {
                'Cookie': adminCookies,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✓ Test notifikacija kreirana:', notificationResponse.data.id);
        
        // Proveri da li je notifikacija dostupna
        const notificationsResponse = await axios.get('http://localhost:5000/api/notifications', {
            headers: {
                'Cookie': adminCookies
            }
        });
        
        console.log('✓ Ukupno notifikacija:', notificationsResponse.data.length);
        
        // Proveri unread count
        const unreadResponse = await axios.get('http://localhost:5000/api/notifications/unread-count', {
            headers: {
                'Cookie': adminCookies
            }
        });
        
        console.log('✓ Nepročitane notifikacije:', unreadResponse.data.count);
        
        console.log('\n=== SISTEM SPREMAN ZA FINALNI TEST ===');
        console.log('KORACI ZA TESTIRANJE:');
        console.log('1. Otvori aplikaciju u browseru');
        console.log('2. Uloguj se kao admin (jelena@frigosistemtodosijevic.me / admin123)');
        console.log('3. Klikni na notification bell u header-u');
        console.log('4. Klikni na test notifikaciju');
        console.log('5. Proveravaj da li se otvara servis #39');
        console.log('6. Ponovo klikni na istu notifikaciju');
        console.log('7. Trebalo bi da radi i drugi put!');
        console.log('\nAko radi, konflikti su rešeni! 🎉');
        
    } catch (error) {
        console.error('Greška pri testiranju:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', error.response.data);
        }
    }
}

testNotificationSystem();