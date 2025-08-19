import cron from 'node-cron';
import { ImageOptimizationService } from './image-optimization-service';

export class StorageOptimizationCron {
  /**
   * Pokreće cron job za automatsko brisanje starih fotografija
   */
  static startCleanupJob(): void {
    // Pokretaj svake nedelje u nedelju u 03:00 (Belgrade vreme)
    cron.schedule('0 3 * * 0', async () => {
      console.log('🧹 [STORAGE CLEANUP] Pokretanje nedeljnog čišćenja starih fotografija...');
      
      try {
        const result = await ImageOptimizationService.cleanupOldPhotos();
        
        console.log('✅ [STORAGE CLEANUP] Cleanup završen uspešno:');
        console.log(`   📁 Obrisano fajlova: ${result.deletedCount}`);
        console.log(`   💾 Oslobođen prostor: ${(result.spaceSaved / 1024 / 1024).toFixed(2)} MB`);
        
        // Log detalje samo ako ima obrisanih fajlova
        if (result.details.length > 0) {
          console.log('   📋 Detalji:');
          result.details.forEach(detail => console.log(`      • ${detail}`));
        }
        
      } catch (error) {
        console.error('❌ [STORAGE CLEANUP] Greška pri čišćenju starih fotografija:', error);
      }
    }, {
      timezone: 'Europe/Belgrade'
    });
    
    console.log('🗓️ [STORAGE CLEANUP] Automatsko brisanje starih fotografija zakazano za svaku nedelju u 03:00');
  }

  /**
   * Pokreće cron job za mesečne statistike storage-a
   */
  static startMonthlyStatsJob(): void {
    // Prvi dan u mesecu u 09:00
    cron.schedule('0 9 1 * *', async () => {
      console.log('📊 [STORAGE STATS] Kreiranje mesečnih statistika storage-a...');
      
      try {
        // Ovde možemo dodati logiku za kreiranje mesečnog izveštaja
        // o korišćenju storage-a i slanje administratoru
        console.log('📧 Mesečni izveštaj o storage-u kreiran (TODO: implementirati email)');
        
      } catch (error) {
        console.error('❌ [STORAGE STATS] Greška pri kreiranju mesečnih statistika:', error);
      }
    }, {
      timezone: 'Europe/Belgrade'
    });
    
    console.log('📅 [STORAGE STATS] Mesečne statistike storage-a zakazane za prvi dan meseca u 09:00');
  }

  /**
   * Pokreće sve storage optimization cron job-ove
   */
  static startAll(): void {
    this.startCleanupJob();
    this.startMonthlyStatsJob();
    console.log('🚀 [STORAGE OPTIMIZATION] Svi storage optimization cron job-ovi pokrenuti');
  }
}