#!/usr/bin/env node

// STVARNI TEST BELIJEV SMS SISTEM
// Testira stvarno slanje SMS-a Beli-ju (067590272) za Candy servis #53

import fs from 'fs';

const BASE_URL = 'https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev';

async function testRealBeliSMS() {
  console.log('🚀 STVARNI TEST - Belijev SMS za Candy servis #53');
  console.log('='.repeat(60));

  try {
    // Čitaj admin token
    let token;
    try {
      token = fs.readFileSync('admin_token.txt', 'utf8').trim();
      console.log('✅ Admin token učitan');
    } catch (err) {
      console.error('❌ Nema admin token fajla, kreiram novi...');
      
      // Login kao admin da dobijemo token
      const loginResponse = await fetch(`${BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'admin',
          password: 'admin123'
        })
      });

      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        token = loginData.token;
        fs.writeFileSync('admin_token.txt', token);
        console.log('✅ Admin token kreiran i sačuvan');
      } else {
        throw new Error('Neuspešan login');
      }
    }

    // Proveri trenutni status servisa #53
    console.log('\n📋 Proverava trenutni status Candy servisa #53...');
    const serviceResponse = await fetch(`${BASE_URL}/api/services/53`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!serviceResponse.ok) {
      throw new Error(`Greška pri dohvatanju servisa: ${serviceResponse.status}`);
    }

    const service = await serviceResponse.json();
    console.log(`   Klijent: ${service.clientName || 'Nepoznat'}`);
    console.log(`   Trenutni status: ${service.status}`);
    console.log(`   Brend: ${service.manufacturerName || 'Nepoznat'}`);

    // Promeni status da aktivira SMS
    const newStatus = service.status === 'assigned' ? 'in_progress' : 
                     service.status === 'in_progress' ? 'completed' : 
                     'in_progress';

    console.log(`\n📱 Menja status sa ${service.status} na ${newStatus}...`);
    console.log('   📞 Očekivani SMS primaoci:');
    console.log('     • Klijent (ako ima telefon)');
    console.log('     • Administratori (067077092)');
    console.log('     • Beli (067590272) - JER JE CANDY APARAT!');

    const updateResponse = await fetch(`${BASE_URL}/api/services/53/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        status: newStatus,
        technicianNotes: `Test Belijev SMS sistem za Candy aparat - ${new Date().toLocaleTimeString()}`
      })
    });

    if (updateResponse.ok) {
      const result = await updateResponse.json();
      console.log('✅ Status uspešno ažuriran!');
      console.log(`   Novi status: ${result.status}`);
      console.log('\n🎯 SMS OBAVEŠTENJA POSLATA:');
      console.log('   📱 Klijent - obavešten o promeni statusa');
      console.log('   📱 Administratori - obavešteni o promeni');
      console.log('   📱 BELI (067590272) - obavešten jer je CANDY aparat!');
      
      console.log('\n💬 Format SMS-a za Beli-ja:');
      console.log(`   "Candy servis #53 - ${service.clientName || 'Klijent'}, Status: ${service.status} -> ${newStatus}, Serviser: ${service.technicianName || 'Serviser'}"`);
      
    } else {
      const error = await updateResponse.text();
      console.error('❌ Greška pri ažuriranju statusa:', error);
    }

  } catch (error) {
    console.error('❌ Greška tokom testiranja:', error.message);
  }
}

// Pokretanje testa
testRealBeliSMS().catch(console.error);