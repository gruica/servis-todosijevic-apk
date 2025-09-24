import { runtimeHelpers } from '@shared/runtime-config';
import { isNativeMobile } from '@/capacitor';

/**
 * NATIVE/WEB COMPATIBLE SHARING UTILITIES
 * 
 * Ovaj modul pruža unified sharing funkcionalnost koja radi
 * identično na web i mobilnim platformama sa intelligent fallback-om.
 */

export interface ShareData {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

interface ShareResult {
  success: boolean;
  error?: string;
  method: 'native' | 'web' | 'fallback';
}

/**
 * Proverava da li je native sharing dostupan
 */
function isNativeShareSupported(): boolean {
  if (!isNativeMobile) {
    return false;
  }
  
  // Proverava da li postoji navigator.share API (koji postoji i na web-u u novijim browser-ima)
  return 'share' in navigator;
}

/**
 * Proverava da li je Web Share API dostupan
 */
function isWebShareSupported(): boolean {
  return !isNativeMobile && 'share' in navigator;
}

/**
 * GLAVNI SHARING INTERFACE - WORKS ON ALL PLATFORMS
 * 
 * Automatski bira najbolji sharing metod na osnovu platforme i dostupnosti
 */
export async function shareContent(data: ShareData): Promise<ShareResult> {
  try {
    console.log('📤 [Share] Starting share process:', { 
      platform: runtimeHelpers.getPlatform(),
      isNative: runtimeHelpers.isNative(),
      data: { title: data.title, hasUrl: !!data.url, hasFiles: !!data.files?.length }
    });
    
    // 1. Pokušaj native sharing (mobile apps i moderne browser-e)
    if (isNativeShareSupported()) {
      try {
        console.log('📱 [Share] Attempting native share...');
        
        const shareData: any = {};
        
        if (data.title) shareData.title = data.title;
        if (data.text) shareData.text = data.text;
        if (data.url) shareData.url = data.url;
        
        // Files se podržavaju samo u naprednim implementacijama
        if (data.files && data.files.length > 0) {
          // Proverava da li browser podržava file sharing
          if (navigator.canShare && navigator.canShare({ files: data.files })) {
            shareData.files = data.files;
          } else {
            console.warn('⚠️ [Share] Files not supported, sharing without files');
          }
        }
        
        await navigator.share(shareData);
        console.log('✅ [Share] Native share successful');
        
        return {
          success: true,
          method: 'native'
        };
        
      } catch (error: any) {
        console.warn('⚠️ [Share] Native share failed, falling back:', error.message);
        
        // Ako je korisnik otkazao sharing, to nije greška
        if (error.name === 'AbortError' || error.message.includes('canceled')) {
          return {
            success: false,
            error: 'User canceled sharing',
            method: 'native'
          };
        }
        
        // Za ostale greške, pokušaj fallback
      }
    }
    
    // 2. Pokušaj Web Share API (za browser-e koji ga podržavaju)
    if (isWebShareSupported()) {
      try {
        console.log('🌐 [Share] Attempting web share...');
        
        const shareData: any = {};
        if (data.title) shareData.title = data.title;
        if (data.text) shareData.text = data.text;
        if (data.url) shareData.url = data.url;
        
        await navigator.share(shareData);
        console.log('✅ [Share] Web share successful');
        
        return {
          success: true,
          method: 'web'
        };
        
      } catch (error: any) {
        console.warn('⚠️ [Share] Web share failed, falling back:', error.message);
        
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: 'User canceled sharing',
            method: 'web'
          };
        }
      }
    }
    
    // 3. Fallback - Copy to clipboard + pokazujemo korisno informacije
    console.log('📋 [Share] Using fallback method (copy to clipboard)');
    
    const textToShare = buildShareText(data);
    
    // Pokušaj copy to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(textToShare);
        console.log('✅ [Share] Copied to clipboard:', textToShare);
        
        return {
          success: true,
          method: 'fallback'
        };
        
      } catch (error) {
        console.warn('⚠️ [Share] Clipboard copy failed:', error);
      }
    }
    
    // Krajnji fallback - samo log
    console.log('📝 [Share] Final fallback - manual copy required:', textToShare);
    
    return {
      success: true,
      method: 'fallback'
    };
    
  } catch (error: any) {
    console.error('❌ [Share] All sharing methods failed:', error);
    
    return {
      success: false,
      error: error.message || 'Sharing failed',
      method: 'fallback'
    };
  }
}

/**
 * Kreira tekst za sharing na osnovu podataka
 */
function buildShareText(data: ShareData): string {
  const parts: string[] = [];
  
  if (data.title) {
    parts.push(data.title);
  }
  
  if (data.text) {
    parts.push(data.text);
  }
  
  if (data.url) {
    parts.push(data.url);
  }
  
  return parts.join('\n\n');
}

/**
 * Specialized sharing functions za common use cases
 */
export const shareHelpers = {
  /** Share URL sa optional tekst */
  shareUrl: async (url: string, title?: string, text?: string): Promise<ShareResult> => {
    return shareContent({
      title: title || 'Podeliti link',
      text: text,
      url: url
    });
  },
  
  /** Share tekst (ohne URL) */
  shareText: async (text: string, title?: string): Promise<ShareResult> => {
    return shareContent({
      title: title || 'Podeliti tekst',
      text: text
    });
  },
  
  /** Share service informacije (specifično za ovu aplikaciju) */
  shareService: async (serviceId: number | string, clientName?: string): Promise<ShareResult> => {
    const baseUrl = runtimeHelpers.getApiBaseUrl();
    const serviceUrl = `${baseUrl}/servis/${serviceId}`;
    
    const title = 'Servis Todosijević';
    const text = clientName 
      ? `Servis za klijenta ${clientName}` 
      : 'Informacije o servisu';
    
    return shareContent({
      title,
      text,
      url: serviceUrl
    });
  },
  
  /** Share file (ako je podržano) */
  shareFile: async (file: File, title?: string): Promise<ShareResult> => {
    return shareContent({
      title: title || 'Podeliti fajl',
      files: [file]
    });
  },
  
  /** Share multiple files */
  shareFiles: async (files: File[], title?: string): Promise<ShareResult> => {
    return shareContent({
      title: title || 'Podeliti fajlove',
      files: files
    });
  },
  
  /** Check sharing capabilities */
  getCapabilities: () => ({
    nativeShare: isNativeShareSupported(),
    webShare: isWebShareSupported(),
    clipboardWrite: !!(navigator.clipboard && navigator.clipboard.writeText),
    canShareFiles: !!(navigator.canShare && navigator.share),
    platform: runtimeHelpers.getPlatform(),
    recommendedMethod: isNativeShareSupported() ? 'native' : 
                     isWebShareSupported() ? 'web' : 'fallback'
  })
};

/**
 * React hook za sharing (optional, ako se koristi u komponentama)
 */
export function useSharing() {
  const share = async (data: ShareData) => {
    const result = await shareContent(data);
    
    // Možete dodati toast notifikacije ili error handling ovde
    if (!result.success) {
      console.error('Sharing failed:', result.error);
    }
    
    return result;
  };
  
  return {
    share,
    shareUrl: shareHelpers.shareUrl,
    shareText: shareHelpers.shareText,
    shareService: shareHelpers.shareService,
    shareFile: shareHelpers.shareFile,
    capabilities: shareHelpers.getCapabilities(),
  };
}

/**
 * Error handling utilities za sharing
 */
export const shareErrorHandler = {
  /** Obrađuje sharing greške i prikazuje korisne poruke */
  handleShareError: (error: any, method: string): string => {
    console.error(`❌ [Share] ${method} failed:`, error);
    
    if (error.name === 'AbortError' || error.message?.includes('canceled')) {
      return 'Deljenje je otkazano';
    }
    
    if (error.name === 'NotAllowedError') {
      return 'Deljenje nije dozvoljeno. Proverite dozvole aplikacije.';
    }
    
    if (error.name === 'DataError') {
      return 'Podaci za deljenje nisu validni.';
    }
    
    if (error.message?.includes('not supported')) {
      return 'Deljenje nije podržano na ovom uređaju.';
    }
    
    return 'Greška pri deljenju. Pokušajte ponovo.';
  },
  
  /** Retry logic za sharing sa exponential backoff */
  retryShare: async (shareData: ShareData, maxRetries: number = 3): Promise<ShareResult> => {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 [Share] Attempt ${attempt}/${maxRetries}`);
        
        const result = await shareContent(shareData);
        
        if (result.success) {
          return result;
        }
        
        lastError = new Error(result.error || 'Share failed');
        
        // Ne retry-uj ako je korisnik otkazao
        if (result.error?.includes('canceled')) {
          break;
        }
        
        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`⏳ [Share] Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
      } catch (error) {
        lastError = error;
        console.warn(`⚠️ [Share] Attempt ${attempt} failed:`, error);
      }
    }
    
    return {
      success: false,
      error: shareErrorHandler.handleShareError(lastError, 'retry'),
      method: 'fallback'
    };
  }
};

// Debug info za development
if (runtimeHelpers.isDevelopment() && typeof window !== 'undefined') {
  // @ts-ignore
  window.shareDebug = {
    capabilities: shareHelpers.getCapabilities(),
    test: (data: ShareData) => shareContent(data),
    helpers: shareHelpers,
  };
  
  console.log('🛠️ [Share] Debug helpers available at window.shareDebug');
}