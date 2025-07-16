#!/usr/bin/env node

/**
 * Test script demonstrating the complete spare parts notification system workflow
 * This script shows how the system works from technician request to admin notification
 */

import { db } from './server/db.js';
import { NotificationService } from './server/notification-service.js';
import { storage } from './server/storage.js';

async function testSparePartsNotificationSystem() {
  console.log('🔧 TESTIRANJE SISTEMA OBAVEŠTENJA ZA REZERVNE DELOVE');
  console.log('='.repeat(60));

  try {
    // Simulacija kreiranja porudžbine rezervnog dela
    const orderData = {
      serviceId: 1,
      technicianId: 1,
      applianceId: 1,
      partName: 'Kompresor frižidera',
      partNumber: 'COMP-FRG-2024',
      quantity: 1,
      description: 'Potreban novi kompresor za frižider Samsung, stari se pregreava',
      urgency: 'high',
      status: 'pending'
    };

    console.log('📋 Kreiranje porudžbine rezervnog dela...');
    const newOrder = await storage.createSparePartOrder(orderData);
    console.log(`✅ Porudžbina kreirana sa ID: ${newOrder.id}`);

    // Simulacija automatskog obaveštenja za administratore
    console.log('\n🔔 Slanje obaveštenja administratorima...');
    await NotificationService.notifySparePartOrdered(newOrder.id, orderData.technicianId);
    console.log('✅ Obaveštenja poslana svim administratorima');

    // Simulacija ažuriranja statusa porudžbine
    console.log('\n📦 Ažuriranje statusa porudžbine na "ordered"...');
    await storage.updateSparePartOrder(newOrder.id, {
      status: 'ordered',
      supplierName: 'Elektronika Todosijević',
      estimatedCost: '15.000 RSD',
      adminNotes: 'Poručeno od glavnog dobavljača, očekivana dostava za 3 dana'
    });
    
    await NotificationService.notifySparePartStatusChanged(
      newOrder.id,
      'pending',
      'ordered',
      10 // Admin ID
    );
    console.log('✅ Status ažuriran i obaveštenje poslano serviseru');

    // Simulacija prijema rezervnog dela
    console.log('\n📮 Simulacija prijema rezervnog dela...');
    await storage.updateSparePartOrder(newOrder.id, {
      status: 'delivered',
      actualCost: '14.500 RSD',
      receivedDate: new Date(),
      adminNotes: 'Deo je stigao, kvalitet odličan, cena bolja od očekivane'
    });
    
    await NotificationService.notifySparePartReceived(newOrder.id, 10);
    console.log('✅ Obaveštenje o prispeću dela poslano serviseru');

    // Prikaz svih kreirkanih obaveštenja
    console.log('\n📊 PREGLED KREIRKANIH OBAVEŠTENJA:');
    const notifications = await db.select().from(schema.notifications).orderBy(schema.notifications.createdAt);
    
    notifications.forEach((notification, index) => {
      console.log(`${index + 1}. ${notification.type} - ${notification.title}`);
      console.log(`   Korisnik: ${notification.userId}, Prioritet: ${notification.priority}`);
      console.log(`   Poruka: ${notification.message}`);
      console.log(`   Vreme: ${notification.createdAt}`);
      console.log('');
    });

    console.log('🎉 TEST ZAVRŠEN USPEŠNO!');
    console.log('Sistem automatski obaveštava administratore o zahtevima za rezervnim delovima');
    console.log('i servisere o statusu njihovih porudžbina.');
    
  } catch (error) {
    console.error('❌ GREŠKA TOKOM TESTA:', error);
  }
}

// Pokretanje testa
testSparePartsNotificationSystem().catch(console.error);