/**
 * NATIVE CAMERA UTILITIES
 * Capacitor Camera plugin wrapper za cross-platform photo capture
 */

import { Camera, CameraResultType, CameraSource, ImageOptions } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { useToast } from '@/hooks/use-toast';

export interface CameraPhoto {
  base64String?: string;
  dataUrl: string;
  format: 'jpeg' | 'png' | 'webp';
  saved: boolean;
  path?: string;
  webPath?: string;
}

export interface PhotoCaptureOptions {
  quality?: number; // 0-100
  source?: 'camera' | 'gallery' | 'prompt';
  correctOrientation?: boolean;
  saveToGallery?: boolean;
  allowEditing?: boolean;
  width?: number;
  height?: number;
}

class NativeCameraService {
  private static instance: NativeCameraService;
  
  public static getInstance(): NativeCameraService {
    if (!NativeCameraService.instance) {
      NativeCameraService.instance = new NativeCameraService();
    }
    return NativeCameraService.instance;
  }

  /**
   * Proverava da li je native camera plugin dostupan
   */
  public isNativeSupported(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Traži dozvole za kameru
   */
  public async requestPermissions(): Promise<{ camera: boolean; photos: boolean }> {
    try {
      if (!this.isNativeSupported()) {
        console.log('📱 [Camera] Web platform - koriste se web API-ji');
        return { camera: true, photos: true };
      }

      const permissions = await Camera.requestPermissions();
      console.log('📱 [Camera] Permissions:', permissions);
      
      return {
        camera: permissions.camera === 'granted',
        photos: permissions.photos === 'granted'
      };
    } catch (error) {
      console.error('❌ [Camera] Permission error:', error);
      return { camera: false, photos: false };
    }
  }

  /**
   * Checks current camera permissions
   */
  public async checkPermissions(): Promise<{ camera: boolean; photos: boolean }> {
    try {
      if (!this.isNativeSupported()) {
        return { camera: true, photos: true };
      }

      const permissions = await Camera.checkPermissions();
      console.log('📱 [Camera] Current permissions:', permissions);
      
      return {
        camera: permissions.camera === 'granted',
        photos: permissions.photos === 'granted'
      };
    } catch (error) {
      console.error('❌ [Camera] Check permissions error:', error);
      return { camera: false, photos: false };
    }
  }

  /**
   * Hvata fotografiju sa kamere (native ili web fallback)
   */
  public async takePhoto(options: PhotoCaptureOptions = {}): Promise<CameraPhoto> {
    console.log('📸 [Camera] Taking photo with options:', options);

    try {
      // Proverava dozvole prvo
      const permissions = await this.checkPermissions();
      if (!permissions.camera) {
        const requestResult = await this.requestPermissions();
        if (!requestResult.camera) {
          throw new Error('Dozvola za kameru je potrebna za snimanje fotografija');
        }
      }

      // Priprema Capacitor opcije
      const imageOptions: ImageOptions = {
        quality: options.quality || 80,
        allowEditing: options.allowEditing || false,
        resultType: CameraResultType.DataUrl, // Vraća base64 data URL
        correctOrientation: options.correctOrientation !== false,
        saveToGallery: options.saveToGallery || false,
      };

      // Postavlja source
      switch (options.source) {
        case 'camera':
          imageOptions.source = CameraSource.Camera;
          break;
        case 'gallery':
          imageOptions.source = CameraSource.Photos;
          break;
        default:
          imageOptions.source = CameraSource.Prompt; // Pita korisnika da odabere
          break;
      }

      // Postavlja dimenzije ako su specificirane
      if (options.width) imageOptions.width = options.width;
      if (options.height) imageOptions.height = options.height;

      // Hvata fotografiju
      const photo = await Camera.getPhoto(imageOptions);
      
      console.log('📸 [Camera] Photo captured successfully');
      
      // Vraća standardizovani format
      return {
        dataUrl: photo.dataUrl!,
        base64String: photo.dataUrl?.replace(/^data:image\/[a-z]+;base64,/, ''),
        format: photo.format === 'png' ? 'png' : 'jpeg',
        saved: photo.saved || false,
        path: photo.path,
        webPath: photo.webPath
      };

    } catch (error: any) {
      console.error('❌ [Camera] Photo capture failed:', error);
      
      if (error.message?.includes('User cancelled')) {
        throw new Error('Snimanje fotografije je otkazano');
      }
      
      if (error.message?.includes('permission')) {
        throw new Error('Dozvola za kameru je potrebna za snimanje fotografija');
      }
      
      throw new Error(`Greška pri snimanju fotografije: ${error.message || 'Neočekivana greška'}`);
    }
  }

  /**
   * Izbacuje fotografiju iz galerije (native ili web fallback)
   */
  public async pickFromGallery(options: PhotoCaptureOptions = {}): Promise<CameraPhoto> {
    return this.takePhoto({ ...options, source: 'gallery' });
  }

  /**
   * Web fallback za camera capture pomoću HTML5 API
   */
  public async webCameraCapture(): Promise<CameraPhoto> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment'; // Preferira rear camera

      input.addEventListener('change', (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) {
          reject(new Error('Nijedna datoteka nije odabrana'));
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          resolve({
            dataUrl,
            base64String: dataUrl.replace(/^data:image\/[a-z]+;base64,/, ''),
            format: file.type.includes('png') ? 'png' : 'jpeg',
            saved: false
          });
        };
        
        reader.onerror = () => {
          reject(new Error('Greška pri čitanju datoteke'));
        };
        
        reader.readAsDataURL(file);
      });

      input.click();
    });
  }

  /**
   * Web fallback za gallery selection
   */
  public async webGalleryPick(): Promise<CameraPhoto> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';

      input.addEventListener('change', (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) {
          reject(new Error('Nijedna datoteka nije odabrana'));
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          resolve({
            dataUrl,
            base64String: dataUrl.replace(/^data:image\/[a-z]+;base64,/, ''),
            format: file.type.includes('png') ? 'png' : 'jpeg',
            saved: false
          });
        };
        
        reader.onerror = () => {
          reject(new Error('Greška pri čitanju datoteke'));
        };
        
        reader.readAsDataURL(file);
      });

      input.click();
    });
  }
}

// Export singleton instance
export const nativeCamera = NativeCameraService.getInstance();

/**
 * React hook za easy camera capture
 */
export function useNativeCamera() {
  const { toast } = useToast();

  const capturePhoto = async (options?: PhotoCaptureOptions) => {
    try {
      if (nativeCamera.isNativeSupported()) {
        return await nativeCamera.takePhoto(options);
      } else {
        return await nativeCamera.webCameraCapture();
      }
    } catch (error: any) {
      toast({
        title: "Greška pri snimanju",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const pickFromGallery = async (options?: PhotoCaptureOptions) => {
    try {
      if (nativeCamera.isNativeSupported()) {
        return await nativeCamera.pickFromGallery(options);
      } else {
        return await nativeCamera.webGalleryPick();
      }
    } catch (error: any) {
      toast({
        title: "Greška pri izboru slike",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    capturePhoto,
    pickFromGallery,
    isNativeSupported: nativeCamera.isNativeSupported(),
    requestPermissions: () => nativeCamera.requestPermissions(),
    checkPermissions: () => nativeCamera.checkPermissions()
  };
}