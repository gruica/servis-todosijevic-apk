/**
 * PLATFORM-AWARE SHARING UTILITIES
 * 
 * Ovaj modul omogućava sharing funkcionalnosti koje rade
 * identično na web i native platformama sa intelligent
 * fallback mehanizmima i optimizovanim korisničkim iskustvom.
 */

import { Capacitor } from '@capacitor/core';
import { runtimeHelpers } from '@shared/runtime-config';

/**
 * Interface za share podatke
 */
interface ShareData {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

/**
 * Interface za share result
 */
interface ShareResult {
  success: boolean;
  error?: string;
  activityType?: string;
}

/**
 * NAPREDNI NATIVE SHARING SA WEB SHARE API FALLBACK
 * 
 * Koristi Capacitor Share plugin za native platforme,
 * Web Share API za moderne browser-e, i clipboard fallback
 */
export async function shareContent(data: ShareData): Promise<ShareResult> {
  try {
    console.log('📤 [Share] Starting share:', data);
    
    // Native sharing za mobilne aplikacije
    if (runtimeHelpers.isNative()) {
      return await shareNative(data);
    }
    
    // Web Share API za moderne browser-e
    if (canUseWebShareAPI(data)) {
      return await shareWeb(data);
    }
    
    // Fallback na clipboard + toast
    return await shareFallback(data);
    
  } catch (error) {
    console.error('❌ [Share] Share failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Sharing failed'
    };
  }
}

/**
 * Native sharing implementation za Capacitor aplikacije
 */
async function shareNative(data: ShareData): Promise<ShareResult> {
  try {
    console.log('📱 [Share] Using native sharing');
    
    // Dinamički import Capacitor Share plugin-a
    const { Share } = await import('@capacitor/share');
    
    // Pripremi podatke za Capacitor Share
    const shareOptions: any = {};
    
    if (data.title) shareOptions.title = data.title;
    if (data.text) shareOptions.text = data.text;
    if (data.url) shareOptions.url = data.url;
    
    // Capacitor Share API poziv
    const result = await Share.share(shareOptions);
    
    console.log('✅ [Share] Native share successful:', result);
    
    return {
      success: true,
      activityType: result.activityType,
    };
    
  } catch (error) {
    console.error('❌ [Share] Native share failed:', error);
    
    // Fallback na web sharing ako native ne radi
    if (canUseWebShareAPI(data)) {
      console.log('🔄 [Share] Falling back to web share');
      return await shareWeb(data);
    }
    
    // Ultimate fallback
    return await shareFallback(data);
  }
}

/**
 * Web Share API implementation za moderne browser-e
 */
async function shareWeb(data: ShareData): Promise<ShareResult> {
  try {
    console.log('🌐 [Share] Using Web Share API');
    
    // Proveri da li su files podržani
    if (data.files && data.files.length > 0) {
      if (!canShareFiles()) {
        console.warn('⚠️ [Share] Files not supported, using fallback');
        return await shareFallback(data);
      }
    }
    
    // Pripremi podatke za navigator.share
    const shareData: any = {};
    
    if (data.title) shareData.title = data.title;
    if (data.text) shareData.text = data.text;
    if (data.url) shareData.url = data.url;
    if (data.files && data.files.length > 0) shareData.files = data.files;
    
    // Navigator.share API poziv
    await navigator.share(shareData);
    
    console.log('✅ [Share] Web share successful');
    
    return {
      success: true,
      activityType: 'web-share-api',
    };
    
  } catch (error) {
    console.error('❌ [Share] Web share failed:', error);
    
    // Ako je korisnik otkazao sharing, to nije greška
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: 'User cancelled sharing',
      };
    }
    
    // Fallback na clipboard
    return await shareFallback(data);
  }
}

/**
 * Fallback sharing implementation (clipboard + notification)
 */
async function shareFallback(data: ShareData): Promise<ShareResult> {
  try {
    console.log('📋 [Share] Using clipboard fallback');
    
    // Kreiraj text za copying
    let textToCopy = '';
    
    if (data.title) textToCopy += `${data.title}\n`;
    if (data.text) textToCopy += `${data.text}\n`;
    if (data.url) textToCopy += `${data.url}`;
    
    // Copy u clipboard
    if (textToCopy.trim()) {
      await copyToClipboard(textToCopy.trim());
      
      // Prikaži success toast (ako je dostupan)
      showShareToast('Podaci su kopirani u clipboard!', 'success');
      
      console.log('✅ [Share] Clipboard fallback successful');
      
      return {
        success: true,
        activityType: 'clipboard-fallback',
      };
    } else {
      throw new Error('No content to share');
    }
    
  } catch (error) {
    console.error('❌ [Share] Clipboard fallback failed:', error);
    
    // Prikaži error toast
    showShareToast('Greška pri dijeljenju sadržaja', 'error');
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Clipboard failed'
    };
  }
}

/**
 * Copy text u clipboard sa cross-platform support
 */
async function copyToClipboard(text: string): Promise<void> {
  try {
    // Modern Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    
    // Fallback na deprecated execCommand
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.opacity = '0';
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    if (!successful) {
      throw new Error('execCommand copy failed');
    }
    
  } catch (error) {
    console.error('❌ [Share] Clipboard copy failed:', error);
    throw error;
  }
}

/**
 * Prikaži toast notification za sharing
 */
function showShareToast(message: string, type: 'success' | 'error' = 'success'): void {
  try {
    // Pokušaj koristiti aplikacijski toast sistem
    if (typeof window !== 'undefined' && (window as any).showToast) {
      (window as any).showToast({
        title: type === 'success' ? 'Uspjeh' : 'Greška',
        description: message,
        variant: type === 'error' ? 'destructive' : 'default',
      });
      return;
    }
    
    // Fallback na browser alert (samo za greške)
    if (type === 'error') {
      alert(message);
    } else {
      console.log(`📢 [Share] ${message}`);
    }
    
  } catch (error) {
    console.error('❌ [Share] Toast failed:', error);
  }
}

/**
 * Provera da li je Web Share API dostupan
 */
function canUseWebShareAPI(data: ShareData): boolean {
  if (typeof navigator === 'undefined' || !navigator.share) {
    return false;
  }
  
  // Proveri da li imamo podatke za sharing
  const hasBasicData = !!(data.title || data.text || data.url);
  const hasFiles = !!(data.files && data.files.length > 0);
  
  if (!hasBasicData && !hasFiles) {
    return false;
  }
  
  // Ako imamo files, proveri da li su podržani
  if (hasFiles && !canShareFiles()) {
    return false;
  }
  
  return true;
}

/**
 * Provera da li su files podržani u Web Share API
 */
function canShareFiles(): boolean {
  return !!(navigator.canShare && File);
}

/**
 * HELPER FUNKCIJE ZA RAZLIČITE TIPOVE SHARING-A
 */

/**
 * Share tekst sadržaj
 */
export async function shareText(text: string, title?: string): Promise<ShareResult> {
  return shareContent({
    title: title || 'Podjeli tekst',
    text: text,
  });
}

/**
 * Share URL link
 */
export async function shareUrl(url: string, title?: string, description?: string): Promise<ShareResult> {
  return shareContent({
    title: title || 'Podjeli link',
    text: description,
    url: url,
  });
}

/**
 * Share service details (specifično za ovu aplikaciju)
 */
export async function shareService(serviceData: {
  id: number;
  serviceNumber: string;
  clientName: string;
  appliance: string;
  status: string;
}): Promise<ShareResult> {
  const baseUrl = runtimeHelpers.getApiBaseUrl();
  const serviceUrl = `${baseUrl}/service/${serviceData.id}`;
  
  const title = `Servis #${serviceData.serviceNumber}`;
  const text = `Klijent: ${serviceData.clientName}\nUređaj: ${serviceData.appliance}\nStatus: ${serviceData.status}`;
  
  return shareContent({
    title,
    text,
    url: serviceUrl,
  });
}

/**
 * Share QR kod ili fotografiju
 */
export async function shareFile(file: File, title?: string, description?: string): Promise<ShareResult> {
  return shareContent({
    title: title || 'Podjeli datoteku',
    text: description,
    files: [file],
  });
}

/**
 * UTILITY FUNKCIJE ZA CHECKING DOSTUPNOSTI
 */

/**
 * Provera da li je sharing dostupan na trenutnoj platformi
 */
export function isSharingAvailable(): boolean {
  // Native sharing uvek dostupan
  if (runtimeHelpers.isNative()) {
    return true;
  }
  
  // Web - proveri Web Share API ili clipboard
  return canUseWebShareAPI({ text: 'test' }) || !!(navigator.clipboard || document.queryCommandSupported?.('copy'));
}

/**
 * Provera da li je file sharing dostupan
 */
export function isFileSharingAvailable(): boolean {
  // Native platforms podržavaju file sharing
  if (runtimeHelpers.isNative()) {
    return true;
  }
  
  // Web - proveri Web Share API sa files
  return canShareFiles();
}

/**
 * Dobij sharing capabilities za UI
 */
export function getSharingCapabilities(): {
  canShareText: boolean;
  canShareUrl: boolean;
  canShareFiles: boolean;
  preferredMethod: 'native' | 'web' | 'clipboard';
} {
  const isNative = runtimeHelpers.isNative();
  const canUseWebShare = canUseWebShareAPI({ text: 'test' });
  const canUseClipboard = !!(navigator.clipboard || document.queryCommandSupported?.('copy'));
  
  return {
    canShareText: isNative || canUseWebShare || canUseClipboard,
    canShareUrl: isNative || canUseWebShare || canUseClipboard,
    canShareFiles: isNative || canShareFiles(),
    preferredMethod: isNative ? 'native' : canUseWebShare ? 'web' : 'clipboard',
  };
}

// Development debugging
if (runtimeHelpers.isDevelopment() && typeof window !== 'undefined') {
  // @ts-ignore - debug helper
  window.shareDebug = {
    shareText,
    shareUrl,
    shareService,
    shareFile,
    getSharingCapabilities,
    isSharingAvailable,
    isFileSharingAvailable,
  };
  
  console.log('🛠️ [Share] Debug helpers available at window.shareDebug');
}