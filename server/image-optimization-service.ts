import sharp from 'sharp';
import { File } from '@google-cloud/storage';
import { objectStorageClient } from './objectStorage';

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
}

export class ImageOptimizationService {
  private static readonly DEFAULT_OPTIONS: ImageOptimizationOptions = {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 80,
    format: 'webp'
  };

  /**
   * Instance metoda za optimizaciju slike
   */
  async optimizeImage(
    imageBuffer: Buffer,
    options: ImageOptimizationOptions = {}
  ): Promise<{ buffer: Buffer; metadata: sharp.Metadata; size: number }> {
    const opts = { ...ImageOptimizationService.DEFAULT_OPTIONS, ...options };
    
    let sharpInstance = sharp(imageBuffer);
    
    // Dobijamo metadata originalne slike
    const metadata = await sharpInstance.metadata();
    
    // Resize ako je potrebno
    if (metadata.width && metadata.height) {
      if (metadata.width > (opts.maxWidth || 1920) || metadata.height > (opts.maxHeight || 1080)) {
        sharpInstance = sharpInstance.resize({
          width: opts.maxWidth || 1920,
          height: opts.maxHeight || 1080,
          fit: 'inside',
          withoutEnlargement: true
        });
      }
    }
    
    // Konvertuj u WebP sa kompresijom
    const optimizedBuffer = await sharpInstance
      .webp({ quality: opts.quality })
      .toBuffer();
    
    return {
      buffer: optimizedBuffer,
      metadata,
      size: optimizedBuffer.length
    };
  }

  /**
   * Statička metoda za optimizaciju slike
   */
  static async optimizeImage(
    imageBuffer: Buffer,
    options: ImageOptimizationOptions = {}
  ): Promise<{ buffer: Buffer; metadata: sharp.Metadata; size: number }> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    let sharpInstance = sharp(imageBuffer);
    
    // Dobijamo metadata originalne slike
    const metadata = await sharpInstance.metadata();
    
    // Resize ako je potrebno
    if (metadata.width && metadata.height) {
      if (metadata.width > (opts.maxWidth || 1920) || metadata.height > (opts.maxHeight || 1080)) {
        sharpInstance = sharpInstance.resize({
          width: opts.maxWidth || 1920,
          height: opts.maxHeight || 1080,
          fit: 'inside',
          withoutEnlargement: true
        });
      }
    }
    
    // Konvertuj u WebP sa kompresijom
    const optimizedBuffer = await sharpInstance
      .webp({ quality: opts.quality })
      .toBuffer();
    
    return {
      buffer: optimizedBuffer,
      metadata,
      size: optimizedBuffer.length
    };
  }

  /**
   * Proverava da li je slika prevelika i potrebna optimizacija
   */
  static needsOptimization(
    width?: number,
    height?: number,
    size?: number
  ): boolean {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const { maxWidth, maxHeight } = this.DEFAULT_OPTIONS;
    
    return Boolean(
      (size && size > maxSize) ||
      (width && width > (maxWidth || 1920)) ||
      (height && height > (maxHeight || 1080))
    );
  }

  /**
   * Automatsko brisanje starih fotografija (starijih od 2 godine)
   */
  static async cleanupOldPhotos(): Promise<{
    deletedCount: number;
    spaceSaved: number;
    details: string[];
  }> {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    
    console.log(`🧹 Pokrećem cleanup starih fotografija (starije od ${twoYearsAgo.toISOString()})`);
    
    const details: string[] = [];
    let deletedCount = 0;
    let spaceSaved = 0;
    
    try {
      // Dobijamo private bucket
      const privateDir = process.env.PRIVATE_OBJECT_DIR;
      if (!privateDir) {
        throw new Error('PRIVATE_OBJECT_DIR nije konfigurisan');
      }
      
      // Parse bucket name iz private dir
      const bucketName = privateDir.split('/')[1];
      const bucket = objectStorageClient.bucket(bucketName);
      
      // Lista svih fajlova u uploads direktorijumu
      const [files] = await bucket.getFiles({
        prefix: '.private/uploads/',
      });
      
      for (const file of files) {
        const [metadata] = await file.getMetadata();
        const createdDate = new Date(metadata.timeCreated || Date.now());
        
        if (createdDate < twoYearsAgo) {
          const fileSize = parseInt(String(metadata.size || '0'));
          
          // Brišemo fajl
          await file.delete();
          
          deletedCount++;
          spaceSaved += fileSize;
          details.push(`Obrisana: ${file.name} (${(fileSize / 1024 / 1024).toFixed(2)}MB, kreirana: ${createdDate.toLocaleDateString('sr-RS')})`);
          
          console.log(`🗑️ Obrisana stara fotografija: ${file.name}`);
        }
      }
      
      const spaceSavedMB = spaceSaved / 1024 / 1024;
      console.log(`✅ Cleanup završen: ${deletedCount} fajlova obrisano, ${spaceSavedMB.toFixed(2)}MB oslobođeno`);
      
      return {
        deletedCount,
        spaceSaved,
        details
      };
      
    } catch (error) {
      console.error('❌ Greška pri cleanup-u starih fotografija:', error);
      throw error;
    }
  }

  /**
   * Procena ušteda storage-a sa WebP konverzijom
   */
  static estimateStorageSavings(
    originalSizeMB: number,
    compressionRatio: number = 0.5
  ): {
    originalSize: string;
    optimizedSize: string;
    savings: string;
    savingsPercentage: number;
  } {
    const optimizedSizeMB = originalSizeMB * compressionRatio;
    const savingsMB = originalSizeMB - optimizedSizeMB;
    const savingsPercentage = Math.round((1 - compressionRatio) * 100);
    
    return {
      originalSize: `${originalSizeMB.toFixed(2)} MB`,
      optimizedSize: `${optimizedSizeMB.toFixed(2)} MB`,
      savings: `${savingsMB.toFixed(2)} MB`,
      savingsPercentage
    };
  }
}