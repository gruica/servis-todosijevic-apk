import axios from 'axios';
import fs from 'fs';

// Kreiranje admin notifikacije za test
async function createTestNotification() {
    const cookieJar = fs.readFileSync('admin_cookies.txt', 'utf8');
    
    console.log('=== TESTIRANJE NOTIFIKACIJA SISTEMA ===');
    
    try {
        // Kreiraj test notifikaciju
        const response = await axios.post('http://localhost:5000/api/notifications', {
            type: 'service_assigned',
            userId: 10, // admin jelena
            message: 'Test notifikacija za servis #39',
            relatedServiceId: 39,
            metadata: {
                serviceId: 39,
                technicianId: 1,
                assignedBy: 'admin'
            }
        }, {
            headers: {
                'Cookie': cookieJar,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✓ Test notifikacija kreirana:', response.data.id);
        
        // Proveri da li je notifikacija dostupna
        const notificationsResponse = await axios.get('http://localhost:5000/api/notifications', {
            headers: {
                'Cookie': cookieJar
            }
        });
        
        console.log('✓ Ukupno notifikacija:', notificationsResponse.data.length);
        
        // Proveri unread count
        const unreadResponse = await axios.get('http://localhost:5000/api/notifications/unread-count', {
            headers: {
                'Cookie': cookieJar
            }
        });
        
        console.log('✓ Nepročitane notifikacije:', unreadResponse.data.count);
        
        console.log('\n=== SISTEM SPREMAN ZA TEST ===');
        console.log('1. Otvori aplikaciju u browseru');
        console.log('2. Uloguj se kao admin (jelena@frigosistemtodosijevic.me / admin123)');
        console.log('3. Klikni na notification bell u header-u');
        console.log('4. Klikni na test notifikaciju');
        console.log('5. Proveriti da li se automatski otvara servis #39');
        console.log('6. Pokušaj ponovo da klikneš na notifikaciju');
        console.log('7. Trebalo bi da radi i drugi put!');
        
    } catch (error) {
        console.error('Greška pri kreiranju test notifikacije:', error.response?.data || error.message);
    }
}

createTestNotification();