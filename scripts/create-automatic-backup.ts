/**
 * Automatski backup skripta koja se pokreće svaki dan
 * Kreira dnevne backup-ove i čuva ih u ./backups direktorijumu
 */

import { createBackup } from './database-backup';
import { promises as fs } from 'fs';
import { join } from 'path';

const BACKUP_DIR = './backups';
const MAX_BACKUPS = 30; // Čuva 30 dana backup-ova

async function cleanOldBackups() {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const backupFiles = files
      .filter(file => file.startsWith('backup-') && file.endsWith('.json'))
      .map(file => ({
        name: file,
        path: join(BACKUP_DIR, file),
        stats: null as any
      }));

    // Dobijanje informacija o fajlovima
    for (const file of backupFiles) {
      file.stats = await fs.stat(file.path);
    }

    // Sortiranje po datumu (najstariji prvi)
    backupFiles.sort((a, b) => a.stats.mtime.getTime() - b.stats.mtime.getTime());

    // Brisanje starih backup-ova ako ima više od MAX_BACKUPS
    if (backupFiles.length > MAX_BACKUPS) {
      const filesToDelete = backupFiles.slice(0, backupFiles.length - MAX_BACKUPS);
      
      console.log(`🗑️  Brisanje ${filesToDelete.length} starih backup-ova...`);
      
      for (const file of filesToDelete) {
        await fs.unlink(file.path);
        console.log(`   Obrisan: ${file.name}`);
      }
    }
  } catch (error) {
    console.error('❌ Greška pri čišćenju starih backup-ova:', error);
  }
}

async function createAutomaticBackup() {
  try {
    console.log('🔄 Automatski backup započet...');
    
    // Kreiranje backup-a
    const backupPath = await createBackup(true); // Uključuje notifikacije
    
    // Čišćenje starih backup-ova
    await cleanOldBackups();
    
    console.log('✅ Automatski backup završen uspešno!');
    console.log(`📁 Backup sačuvan u: ${backupPath}`);
    
  } catch (error) {
    console.error('❌ Greška pri automatskom backup-u:', error);
    process.exit(1);
  }
}

// Pokretanje automatskog backup-a
if (import.meta.url === `file://${process.argv[1]}`) {
  createAutomaticBackup();
}

export { createAutomaticBackup };