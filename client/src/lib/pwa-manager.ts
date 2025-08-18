/**
 * PWA Manager - Upravljanje Progressive Web App funkcionalnostima
 */

interface PWAManager {
  isInstallable: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  promptInstall: () => Promise<boolean>;
  registerServiceWorker: () => Promise<boolean>;
  checkForUpdates: () => Promise<boolean>;
  showInstallPrompt: () => void;
}

class PWAManagerImpl implements PWAManager {
  private installPromptEvent: any = null;
  private swRegistration: ServiceWorkerRegistration | null = null;
  
  public isInstallable = false;
  public isInstalled = false;
  public isStandalone = false;

  constructor() {
    this.init();
  }

  private init() {
    // Provjeri da li je app u standalone režimu
    this.isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                       (window.navigator as any)?.standalone === true ||
                       document.referrer.includes('android-app://');
    
    // Provjeri da li je instaliran
    this.isInstalled = this.isStandalone;
    
    console.log(`📱 PWA Status: Standalone=${this.isStandalone}, Installed=${this.isInstalled}`);
    
    // Listenerovati install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('📱 PWA Install prompt detected');
      e.preventDefault();
      this.installPromptEvent = e;
      this.isInstallable = true;
      
      // Emitoraj custom event
      window.dispatchEvent(new CustomEvent('pwa-installable'));
    });

    // Listenerovati app installed
    window.addEventListener('appinstalled', () => {
      console.log('📱 PWA uspešno instalirana');
      this.isInstalled = true;
      this.isInstallable = false;
      this.installPromptEvent = null;
      
      // Emitoraj custom event
      window.dispatchEvent(new CustomEvent('pwa-installed'));
    });
  }

  async registerServiceWorker(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      console.warn('📱 Service Workers nisu podržani');
      return false;
    }

    try {
      // Registruj osnovni service worker
      this.swRegistration = await navigator.serviceWorker.register('/sw.js');
      console.log('📱 Service Worker registrovan:', this.swRegistration);

      // Provjeri za ažuriranja
      this.swRegistration.addEventListener('updatefound', () => {
        console.log('📱 Nova verzija Service Worker-a pronađena');
        const newWorker = this.swRegistration!.installing;
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('✅ Nova verzija aplikacije je dostupna');
              window.dispatchEvent(new CustomEvent('pwa-update-available'));
            }
          });
        }
      });

      // Proveri odmah za ažuriranja
      this.swRegistration.update();
      
      return true;
    } catch (error) {
      console.error('❌ Greška pri registraciji Service Worker-a:', error);
      return false;
    }
  }

  async promptInstall(): Promise<boolean> {
    if (!this.installPromptEvent) {
      console.warn('📱 Install prompt nije dostupan');
      return false;
    }

    try {
      const result = await this.installPromptEvent.prompt();
      console.log('📱 Install prompt rezultat:', result);
      
      const choiceResult = await result.userChoice;
      console.log('📱 Korisnikov izbor:', choiceResult);
      
      if (choiceResult.outcome === 'accepted') {
        console.log('✅ Korisnik je prihvatio instalaciju');
        this.installPromptEvent = null;
        this.isInstallable = false;
        return true;
      } else {
        console.log('❌ Korisnik je odbio instalaciju');
        return false;
      }
    } catch (error) {
      console.error('❌ Greška pri install prompt-u:', error);
      return false;
    }
  }

  async checkForUpdates(): Promise<boolean> {
    if (!this.swRegistration) {
      console.warn('📱 Service Worker nije registrovan');
      return false;
    }

    try {
      await this.swRegistration.update();
      console.log('📱 Provera za ažuriranja izvršena');
      return true;
    } catch (error) {
      console.error('❌ Greška pri proveri ažuriranja:', error);
      return false;
    }
  }

  showInstallPrompt(): void {
    if (this.isInstallable && !this.isInstalled) {
      // Prikaži custom install prompt
      window.dispatchEvent(new CustomEvent('pwa-show-install-prompt'));
    } else if (this.isInstalled) {
      console.log('📱 Aplikacija je već instalirana');
    } else {
      // Za iOS i druge platforme gde prompt nije podržan
      this.showManualInstallInstructions();
    }
  }

  private showManualInstallInstructions(): void {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/iphone|ipad|ipod/.test(userAgent)) {
      // iOS instrukcije
      window.dispatchEvent(new CustomEvent('pwa-show-ios-instructions'));
    } else if (/android/.test(userAgent)) {
      // Android instrukcije (ako prompt nije podržan)
      window.dispatchEvent(new CustomEvent('pwa-show-android-instructions'));
    } else {
      // Desktop instrukcije
      window.dispatchEvent(new CustomEvent('pwa-show-desktop-instructions'));
    }
  }

  // Helper metode za React komponente
  getInstallInstructions() {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/iphone|ipad|ipod/.test(userAgent)) {
      return {
        platform: 'iOS',
        steps: [
          'Otvorite aplikaciju u Safari browseru',
          'Tapnite ikonu "Podeli" (kvadrat sa strelicom)',
          'Izaberite "Dodaj na početni ekran"',
          'Tapnite "Dodaj" za potvrdu'
        ]
      };
    } else if (/android/.test(userAgent)) {
      return {
        platform: 'Android',
        steps: [
          'Otvorite aplikaciju u Chrome browseru',
          'Tapnite meni (tri tačke) u gornjem desnom uglu',
          'Izaberite "Dodaj na početni ekran"',
          'Tapnite "Dodaj" za potvrdu'
        ]
      };
    } else {
      return {
        platform: 'Desktop',
        steps: [
          'Kliknite na ikonu instalacije u address baru',
          'ili kliknite meni (tri tačke) u browseru',
          'Izaberite "Instaliraj aplikaciju"',
          'Kliknite "Instaliraj" za potvrdu'
        ]
      };
    }
  }
}

// Singleton instance
export const pwaManager = new PWAManagerImpl();

// Helper hook za React komponente
export function usePWA() {
  return {
    isInstallable: pwaManager.isInstallable,
    isInstalled: pwaManager.isInstalled,
    isStandalone: pwaManager.isStandalone,
    promptInstall: pwaManager.promptInstall.bind(pwaManager),
    registerServiceWorker: pwaManager.registerServiceWorker.bind(pwaManager),
    checkForUpdates: pwaManager.checkForUpdates.bind(pwaManager),
    showInstallPrompt: pwaManager.showInstallPrompt.bind(pwaManager),
    installInstructions: pwaManager.getInstallInstructions()
  };
}

// Inicijalizacija PWA Manager-a
export function initializePWA() {
  console.log('📱 Inicijalizacija PWA Manager-a...');
  
  // Registruj service worker
  pwaManager.registerServiceWorker().then((success) => {
    if (success) {
      console.log('✅ PWA Manager uspešno inicijalizovan');
    } else {
      console.warn('⚠️ PWA Manager djelomično inicijalizovan (bez SW)');
    }
  });
  
  return pwaManager;
}