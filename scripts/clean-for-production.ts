/**
 * Skripta za čišćenje baze podataka za produkciju
 * Briše sve test podatke i ostavlja samo produkcijske korisnike i sistemske podatke
 */

import { db } from '../server/db';
import { users, services, clients, appliances, notifications } from '../shared/schema';
import { eq, inArray } from 'drizzle-orm';

interface CleanupStats {
  deletedClients: number;
  deletedServices: number;
  deletedAppliances: number;
  deletedNotifications: number;
  deletedTestUsers: number;
  remainingUsers: number;
}

async function cleanForProduction(): Promise<CleanupStats> {
  console.log('🧹 Počinje čišćenje baze za produkciju...');
  
  let stats: CleanupStats = {
    deletedClients: 0,
    deletedServices: 0,
    deletedAppliances: 0,
    deletedNotifications: 0,
    deletedTestUsers: 0,
    remainingUsers: 0
  };

  // Korisnici koji se zadržavaju u produkciji
  const productionUsers = [
    'jelena@frigosistemtodosijevic.me',    // Admin
    'jovan@frigosistemtodosijevic.com',    // Serviser
    'petar@frigosistemtodosijevic.com',    // Serviser
    'nikola@frigosistemtodosijevic.com',   // Serviser
    'gruica@frigosistemtodosijevic.com',   // Serviser
    'robert.ivezic@tehnoplus.me'           // Poslovni partner
  ];

  try {
    // 1. Briše sve notifikacije
    console.log('🗑️  Brisanje svih notifikacija...');
    const deletedNotifications = await db.delete(notifications);
    stats.deletedNotifications = deletedNotifications.rowCount || 0;
    console.log(`✅ Obrisano ${stats.deletedNotifications} notifikacija`);

    // 2. Briše sve servise
    console.log('🗑️  Brisanje svih servisa...');
    const deletedServices = await db.delete(services);
    stats.deletedServices = deletedServices.rowCount || 0;
    console.log(`✅ Obrisano ${stats.deletedServices} servisa`);

    // 3. Briše sve uređaje
    console.log('🗑️  Brisanje svih uređaja...');
    const deletedAppliances = await db.delete(appliances);
    stats.deletedAppliances = deletedAppliances.rowCount || 0;
    console.log(`✅ Obrisano ${stats.deletedAppliances} uređaja`);

    // 4. Briše sve klijente
    console.log('🗑️  Brisanje svih klijenata...');
    const deletedClients = await db.delete(clients);
    stats.deletedClients = deletedClients.rowCount || 0;
    console.log(`✅ Obrisano ${stats.deletedClients} klijenata`);

    // 5. Briše test korisnike (zadržava samo produkcijske)
    console.log('🗑️  Brisanje test korisnika...');
    const testUsersDeleted = await db.delete(users)
      .where(eq(users.username, 'nikola@servistodosijevic.me')); // Neverifikovani duplikat
    const testUsersDeleted2 = await db.delete(users)
      .where(eq(users.username, 'test@serviser.com')); // Test serviser
    
    stats.deletedTestUsers = (testUsersDeleted.rowCount || 0) + (testUsersDeleted2.rowCount || 0);
    console.log(`✅ Obrisano ${stats.deletedTestUsers} test korisnika`);

    // 6. Proverava preostale korisnike
    const remainingUsers = await db.select().from(users);
    stats.remainingUsers = remainingUsers.length;
    
    console.log('\n📊 Preostali korisnici:');
    remainingUsers.forEach(user => {
      console.log(`   - ${user.fullName} (${user.username}) - ${user.role}`);
    });

    // 7. Resetuje ID sekvence
    console.log('\n🔄 Resetovanje ID sekvenci...');
    await db.execute(`ALTER SEQUENCE clients_id_seq RESTART WITH 1`);
    await db.execute(`ALTER SEQUENCE services_id_seq RESTART WITH 1`);
    await db.execute(`ALTER SEQUENCE appliances_id_seq RESTART WITH 1`);
    await db.execute(`ALTER SEQUENCE notifications_id_seq RESTART WITH 1`);
    console.log('✅ ID sekvence resetovane');

    console.log('\n🎉 Čišćenje kompletno!');
    console.log('📈 Statistike:');
    console.log(`   - Obrisano klijenata: ${stats.deletedClients}`);
    console.log(`   - Obrisano servisa: ${stats.deletedServices}`);
    console.log(`   - Obrisano uređaja: ${stats.deletedAppliances}`);
    console.log(`   - Obrisano notifikacija: ${stats.deletedNotifications}`);
    console.log(`   - Obrisano test korisnika: ${stats.deletedTestUsers}`);
    console.log(`   - Preostalo korisnika: ${stats.remainingUsers}`);

    return stats;

  } catch (error) {
    console.error('❌ Greška pri čišćenju:', error);
    throw error;
  }
}

// Pokreće čišćenje
cleanForProduction()
  .then(stats => {
    console.log('\n✅ Baza je spremna za produkciju!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Neuspešno čišćenje:', error);
    process.exit(1);
  });