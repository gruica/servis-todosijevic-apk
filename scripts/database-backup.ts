/**
 * Kompletna skripta za backup i restore baze podataka
 * Omogućava čuvanje svih podataka iz baze u JSON format
 * i vraćanje podataka iz backup-a
 */

import { db } from '../server/db';
import { eq } from 'drizzle-orm';
import { 
  users, clients, appliances, services, notifications, 
  applianceCategories, manufacturers, maintenanceSchedules,
  sparePartOrders
} from '../shared/schema';
import { promises as fs } from 'fs';
import { join } from 'path';

interface BackupData {
  timestamp: string;
  version: string;
  tables: {
    users: any[];
    clients: any[];
    appliances: any[];
    services: any[];
    notifications: any[];
    applianceCategories: any[];
    manufacturers: any[];
    maintenanceSchedules: any[];
    sparePartOrders: any[];
  };
}

const BACKUP_DIR = './backups';

async function ensureBackupDir() {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    console.log('✅ Backup direktorijum je spreman');
  } catch (error) {
    console.error('❌ Greška pri kreiranju backup direktorijuma:', error);
    throw error;
  }
}

async function createBackup(includeNotifications: boolean = true): Promise<string> {
  console.log('🔄 Kreiranje backup-a baze podataka...');
  
  try {
    await ensureBackupDir();
    
    // Dobijanje podataka iz svih tabela
    const [
      usersData,
      clientsData,
      appliancesData,
      servicesData,
      notificationsData,
      categoriesData,
      manufacturersData,
      maintenanceData,
      sparePartOrdersData
    ] = await Promise.all([
      db.select().from(users),
      db.select().from(clients),
      db.select().from(appliances),
      db.select().from(services),
      includeNotifications ? db.select().from(notifications) : [],
      db.select().from(applianceCategories),
      db.select().from(manufacturers),
      db.select().from(maintenanceSchedules),
      db.select().from(sparePartOrders)
    ]);

    const backupData: BackupData = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      tables: {
        users: usersData,
        clients: clientsData,
        appliances: appliancesData,
        services: servicesData,
        notifications: notificationsData,
        applianceCategories: categoriesData,
        manufacturers: manufacturersData,
        maintenanceSchedules: maintenanceData,
        sparePartOrders: sparePartOrdersData
      }
    };

    // Kreiranje imena fajla sa timestampom
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.json`;
    const filepath = join(BACKUP_DIR, filename);

    // Čuvanje u JSON fajl
    await fs.writeFile(filepath, JSON.stringify(backupData, null, 2));

    console.log('✅ Backup uspešno kreiran!');
    console.log('📁 Lokacija:', filepath);
    console.log('📊 Statistike:');
    console.log(`   - Korisnici: ${usersData.length}`);
    console.log(`   - Klijenti: ${clientsData.length}`);
    console.log(`   - Uređaji: ${appliancesData.length}`);
    console.log(`   - Servisi: ${servicesData.length}`);
    console.log(`   - Notifikacije: ${notificationsData.length}`);
    console.log(`   - Kategorije: ${categoriesData.length}`);
    console.log(`   - Proizvođači: ${manufacturersData.length}`);
    console.log(`   - Planovi održavanja: ${maintenanceData.length}`);
    console.log(`   - Narudžbe delova: ${sparePartOrdersData.length}`);

    return filepath;
  } catch (error) {
    console.error('❌ Greška pri kreiranju backup-a:', error);
    throw error;
  }
}

async function restoreBackup(backupPath: string, skipNotifications: boolean = false): Promise<void> {
  console.log('🔄 Vraćanje podataka iz backup-a...');
  
  try {
    // Čitanje backup fajla
    const backupContent = await fs.readFile(backupPath, 'utf-8');
    const backupData: BackupData = JSON.parse(backupContent);
    
    console.log('📋 Backup informacije:');
    console.log(`   - Kreiran: ${backupData.timestamp}`);
    console.log(`   - Verzija: ${backupData.version}`);
    
    // Brisanje postojećih podataka (osim sistema tabela)
    console.log('🗑️  Brisanje postojećih podataka...');
    await db.delete(sparePartOrders);
    await db.delete(maintenanceSchedules);
    if (!skipNotifications) {
      await db.delete(notifications);
    }
    await db.delete(services);
    await db.delete(appliances);
    await db.delete(clients);
    
    // Brisanje korisnika osim admin-a
    const adminUsers = await db.select().from(users).where(eq(users.role, 'admin'));
    await db.delete(users);
    
    // Vraćanje podataka
    console.log('📥 Vraćanje podataka...');
    
    // Prvo vraćamo sistemske tabele
    if (backupData.tables.applianceCategories.length > 0) {
      await db.insert(applianceCategories).values(backupData.tables.applianceCategories);
    }
    if (backupData.tables.manufacturers.length > 0) {
      await db.insert(manufacturers).values(backupData.tables.manufacturers);
    }
    
    // Zatim korisnike
    if (backupData.tables.users.length > 0) {
      await db.insert(users).values(backupData.tables.users);
    }
    
    // Klijenti
    if (backupData.tables.clients.length > 0) {
      await db.insert(clients).values(backupData.tables.clients);
    }
    
    // Uređaji
    if (backupData.tables.appliances.length > 0) {
      await db.insert(appliances).values(backupData.tables.appliances);
    }
    
    // Servisi
    if (backupData.tables.services.length > 0) {
      await db.insert(services).values(backupData.tables.services);
    }
    
    // Notifikacije (ako nisu preskočene)
    if (!skipNotifications && backupData.tables.notifications.length > 0) {
      await db.insert(notifications).values(backupData.tables.notifications);
    }
    
    // Planovi održavanja
    if (backupData.tables.maintenanceSchedules.length > 0) {
      await db.insert(maintenanceSchedules).values(backupData.tables.maintenanceSchedules);
    }
    
    // Narudžbe rezervnih delova
    if (backupData.tables.sparePartOrders.length > 0) {
      await db.insert(sparePartOrders).values(backupData.tables.sparePartOrders);
    }
    
    console.log('✅ Backup uspešno vraćen!');
    console.log('📊 Vraćene tabele:');
    console.log(`   - Korisnici: ${backupData.tables.users.length}`);
    console.log(`   - Klijenti: ${backupData.tables.clients.length}`);
    console.log(`   - Uređaji: ${backupData.tables.appliances.length}`);
    console.log(`   - Servisi: ${backupData.tables.services.length}`);
    console.log(`   - Notifikacije: ${skipNotifications ? 'preskočene' : backupData.tables.notifications.length}`);
    console.log(`   - Kategorije: ${backupData.tables.applianceCategories.length}`);
    console.log(`   - Proizvođači: ${backupData.tables.manufacturers.length}`);
    console.log(`   - Planovi održavanja: ${backupData.tables.maintenanceSchedules.length}`);
    console.log(`   - Narudžbe delova: ${backupData.tables.sparePartOrders.length}`);
    
  } catch (error) {
    console.error('❌ Greška pri vraćanju backup-a:', error);
    throw error;
  }
}

async function listBackups(): Promise<string[]> {
  try {
    await ensureBackupDir();
    const files = await fs.readdir(BACKUP_DIR);
    const backupFiles = files.filter(file => file.startsWith('backup-') && file.endsWith('.json'));
    
    console.log('📋 Dostupni backup-ovi:');
    if (backupFiles.length === 0) {
      console.log('   Nema dostupnih backup-ova');
      return [];
    }
    
    for (const file of backupFiles) {
      const filepath = join(BACKUP_DIR, file);
      const stats = await fs.stat(filepath);
      const size = (stats.size / 1024).toFixed(2);
      console.log(`   📁 ${file} (${size} KB) - ${stats.mtime.toLocaleDateString()}`);
    }
    
    return backupFiles.map(file => join(BACKUP_DIR, file));
  } catch (error) {
    console.error('❌ Greška pri listanju backup-ova:', error);
    return [];
  }
}

async function main() {
  const command = process.argv[2];
  const argument = process.argv[3];
  
  try {
    switch (command) {
      case 'create':
        const includeNotifications = argument !== '--skip-notifications';
        await createBackup(includeNotifications);
        break;
        
      case 'restore':
        if (!argument) {
          console.error('❌ Morate specificirati put do backup fajla');
          console.log('Primer: npm run backup restore ./backups/backup-2025-07-15.json');
          return;
        }
        const skipNotifications = process.argv[4] === '--skip-notifications';
        await restoreBackup(argument, skipNotifications);
        break;
        
      case 'list':
        await listBackups();
        break;
        
      default:
        console.log('📋 Dostupne komande:');
        console.log('   tsx scripts/database-backup.ts create [--skip-notifications]  - Kreira novi backup');
        console.log('   tsx scripts/database-backup.ts restore <path> [--skip-notifications] - Vraća podatke iz backup-a');
        console.log('   tsx scripts/database-backup.ts list                          - Prikazuje dostupne backup-ove');
        console.log('');
        console.log('Primeri:');
        console.log('   tsx scripts/database-backup.ts create                        - Kreira potpuni backup');
        console.log('   tsx scripts/database-backup.ts create --skip-notifications   - Backup bez notifikacija');
        console.log('   tsx scripts/database-backup.ts restore ./backups/backup-2025-07-15.json');
        console.log('   tsx scripts/database-backup.ts list');
    }
  } catch (error) {
    console.error('❌ Greška:', error);
    process.exit(1);
  }
}

// Pokretanje samo ako je skripta pozvana direktno
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

// Export funkcija za korišćenje u drugim skriptama
export { createBackup, restoreBackup, listBackups };