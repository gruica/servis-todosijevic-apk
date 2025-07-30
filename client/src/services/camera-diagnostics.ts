/**
 * CAMERA DIAGNOSTICS SERVICE
 * Detaljno testiranje i analiza camera capabilities na različitim uređajima
 * Po najvišim svetskim standardima za production sisteme
 */

export interface CameraCapabilities {
  hasCamera: boolean;
  hasTorch: boolean;
  supportedResolutions: Array<{ width: number; height: number }>;
  supportsFacingMode: string[];
  maxResolution: { width: number; height: number } | null;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browserInfo: {
    name: string;
    version: string;
    platform: string;
  };
  constraints: {
    canUseAdvancedConstraints: boolean;
    canUseTorch: boolean;
    canUseZoom: boolean;
    canUseFocus: boolean;
  };
  error?: string;
}

export interface DiagnosticsResult {
  timestamp: number;
  success: boolean;
  capabilities: CameraCapabilities;
  recommendedConstraints: MediaStreamConstraints;
  fallbackConstraints: MediaStreamConstraints;
  warnings: string[];
  errors: string[];
}

class CameraDiagnosticsService {
  private static instance: CameraDiagnosticsService;
  private diagnosticsCache: DiagnosticsResult | null = null;

  public static getInstance(): CameraDiagnosticsService {
    if (!CameraDiagnosticsService.instance) {
      CameraDiagnosticsService.instance = new CameraDiagnosticsService();
    }
    return CameraDiagnosticsService.instance;
  }

  /**
   * Potpuna dijagnostika camera capabilities
   */
  async performFullDiagnostics(): Promise<DiagnosticsResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];

    console.log('🔍 CAMERA DIJAGNOSTIKA: Pokretanje sveobuhvatne analize...');

    try {
      // 1. Detektuj browser info
      const browserInfo = this.detectBrowserInfo();
      console.log('📱 Browser info:', browserInfo);

      // 2. Testiraj osnovni pristup kameri
      const basicAccess = await this.testBasicCameraAccess();
      if (!basicAccess.success) {
        errors.push(`Osnovan camera pristup neuspešan: ${basicAccess.error}`);
      }

      // 3. Analiziraj device capabilities detaljno
      const capabilities = await this.analyzeDetailedCapabilities();
      
      // 4. Testiraj različite constraints kombinacije
      const constraintsTest = await this.testConstraintsCombinations();
      
      // 5. Generiši preporučene constraints
      const recommendedConstraints = this.generateRecommendedConstraints(capabilities, constraintsTest);
      const fallbackConstraints = this.generateFallbackConstraints(capabilities);

      // 6. Generiši upozorenja na osnovu device type-a
      this.generateWarnings(capabilities, warnings);

      const result: DiagnosticsResult = {
        timestamp: startTime,
        success: errors.length === 0,
        capabilities,
        recommendedConstraints,
        fallbackConstraints,
        warnings,
        errors
      };

      this.diagnosticsCache = result;
      console.log('✅ CAMERA DIJAGNOSTIKA: Završena za', Date.now() - startTime, 'ms');
      console.log('📊 Rezultat:', result);

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Nepoznata greška';
      errors.push(`Kritična greška tokom dijagnostike: ${errorMessage}`);
      
      const failedResult: DiagnosticsResult = {
        timestamp: startTime,
        success: false,
        capabilities: this.getEmptyCapabilities(errorMessage),
        recommendedConstraints: this.getBasicConstraints(),
        fallbackConstraints: this.getBasicConstraints(),
        warnings,
        errors
      };

      console.error('❌ CAMERA DIJAGNOSTIKA: Kritična greška', error);
      return failedResult;
    }
  }

  /**
   * Detektuje browser informacije
   */
  private detectBrowserInfo() {
    const userAgent = navigator.userAgent;
    let name = 'Unknown';
    let version = 'Unknown';
    let platform = 'Unknown';

    // Browser detection
    if (userAgent.includes('Chrome')) name = 'Chrome';
    else if (userAgent.includes('Firefox')) name = 'Firefox';
    else if (userAgent.includes('Safari')) name = 'Safari';
    else if (userAgent.includes('Edge')) name = 'Edge';

    // Platform detection
    if (userAgent.includes('Mobile')) platform = 'Mobile';
    else if (userAgent.includes('Tablet')) platform = 'Tablet';
    else platform = 'Desktop';

    // Version extraction (simplified)
    const versionMatch = userAgent.match(new RegExp(`${name}/(\\d+\\.\\d+)`));
    if (versionMatch) version = versionMatch[1];

    return { name, version, platform };
  }

  /**
   * Testira osnovni pristup kameri
   */
  private async testBasicCameraAccess(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🎥 Testiranje osnovnog camera pristupa...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      // Odmah zatvori stream
      stream.getTracks().forEach(track => track.stop());
      
      console.log('✅ Osnovni camera pristup - uspešan');
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Nepoznata camera greška';
      console.error('❌ Osnovni camera pristup - neuspešan:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Detaljno analizira camera capabilities
   */
  private async analyzeDetailedCapabilities(): Promise<CameraCapabilities> {
    const browserInfo = this.detectBrowserInfo();
    let hasCamera = false;
    let hasTorch = false;
    let supportedResolutions: Array<{ width: number; height: number }> = [];
    let supportsFacingMode: string[] = [];
    let maxResolution: { width: number; height: number } | null = null;
    let constraints = {
      canUseAdvancedConstraints: false,
      canUseTorch: false,
      canUseZoom: false,
      canUseFocus: false
    };

    try {
      // Test sa osnovnim constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      hasCamera = true;
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities();
      
      console.log('🔧 Camera capabilities:', capabilities);

      // Analiziraj torch support
      if (capabilities.torch) {
        hasTorch = true;
        constraints.canUseTorch = true;
      }

      // Analiziraj resolution support
      if (capabilities.width && capabilities.height) {
        const maxWidth = Math.max(...(capabilities.width.max ? [capabilities.width.max] : [1920]));
        const maxHeight = Math.max(...(capabilities.height.max ? [capabilities.height.max] : [1080]));
        maxResolution = { width: maxWidth, height: maxHeight };
        
        // Generiši podržane rezolucije
        supportedResolutions = [
          { width: 640, height: 480 },
          { width: 1280, height: 720 },
          { width: 1920, height: 1080 }
        ].filter(res => res.width <= maxWidth && res.height <= maxHeight);
      }

      // Analiziraj facing mode support
      if (capabilities.facingMode) {
        supportsFacingMode = capabilities.facingMode;
      }

      // Test advanced constraints
      constraints.canUseAdvancedConstraints = this.testAdvancedConstraintsSupport(capabilities);
      constraints.canUseZoom = !!capabilities.zoom;
      constraints.canUseFocus = !!capabilities.focusMode;

      // Zatvori stream
      stream.getTracks().forEach(track => track.stop());

    } catch (error) {
      console.error('❌ Greška tokom capability analize:', error);
    }

    const deviceType = this.detectDeviceType(browserInfo);

    return {
      hasCamera,
      hasTorch,
      supportedResolutions,
      supportsFacingMode,
      maxResolution,
      deviceType,
      browserInfo,
      constraints
    };
  }

  /**
   * Testira različite kombinacije constraints
   */
  private async testConstraintsCombinations(): Promise<{
    highResolution: boolean;
    mediumResolution: boolean;
    lowResolution: boolean;
    torchControl: boolean;
    advancedConstraints: boolean;
  }> {
    const results = {
      highResolution: false,
      mediumResolution: false,
      lowResolution: false,
      torchControl: false,
      advancedConstraints: false
    };

    // Test high resolution (1920x1080)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1920, height: 1080, facingMode: 'environment' }
      });
      results.highResolution = true;
      stream.getTracks().forEach(track => track.stop());
      console.log('✅ High resolution (1920x1080) - podržana');
    } catch (error) {
      console.log('⚠️ High resolution (1920x1080) - nije podržana');
    }

    // Test medium resolution (1280x720)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'environment' }
      });
      results.mediumResolution = true;
      stream.getTracks().forEach(track => track.stop());
      console.log('✅ Medium resolution (1280x720) - podržana');
    } catch (error) {
      console.log('⚠️ Medium resolution (1280x720) - nije podržana');
    }

    // Test low resolution (640x480)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'environment' }
      });
      results.lowResolution = true;
      stream.getTracks().forEach(track => track.stop());
      console.log('✅ Low resolution (640x480) - podržana');
    } catch (error) {
      console.log('⚠️ Low resolution (640x480) - nije podržana');
    }

    // Test torch control
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          advanced: [{ torch: true } as any]
        }
      });
      results.torchControl = true;
      stream.getTracks().forEach(track => track.stop());
      console.log('✅ Torch control - podržan');
    } catch (error) {
      console.log('⚠️ Torch control - nije podržan');
    }

    return results;
  }

  /**
   * Generiše preporučene constraints na osnovu capabilities
   */
  private generateRecommendedConstraints(
    capabilities: CameraCapabilities, 
    constraintsTest: any
  ): MediaStreamConstraints {
    const video: any = {
      facingMode: { ideal: "environment" }
    };

    // Rezolucija na osnovu testova
    if (constraintsTest.highResolution) {
      video.width = { ideal: 1920, max: 1920 };
      video.height = { ideal: 1080, max: 1080 };
    } else if (constraintsTest.mediumResolution) {
      video.width = { ideal: 1280, max: 1280 };
      video.height = { ideal: 720, max: 720 };
    } else {
      video.width = 640;
      video.height = 480;
    }

    // Napredni constraints ako su podržani
    if (capabilities.constraints.canUseAdvancedConstraints) {
      if (capabilities.constraints.canUseFocus) {
        video.focusMode = { ideal: "continuous" };
      }
      if (capabilities.constraints.canUseZoom) {
        video.zoom = { ideal: 1.0 };
      }
    }

    return { video };
  }

  /**
   * Generiše fallback constraints za maximum compatibility
   */
  private generateFallbackConstraints(capabilities: CameraCapabilities): MediaStreamConstraints {
    return {
      video: {
        width: 640,
        height: 480,
        facingMode: "environment"
      }
    };
  }

  /**
   * Generiše upozorenja na osnovu device type-a
   */
  private generateWarnings(capabilities: CameraCapabilities, warnings: string[]): void {
    if (!capabilities.hasTorch && capabilities.deviceType === 'mobile') {
      warnings.push('Flash/Torch nije podržan na ovom mobilnom uređaju');
    }

    if (capabilities.maxResolution && capabilities.maxResolution.width < 1280) {
      warnings.push('Niska maksimalna rezolucija može uticati na OCR kvalitet');
    }

    if (!capabilities.constraints.canUseAdvancedConstraints) {
      warnings.push('Napredni camera constraints nisu podržani');
    }

    if (capabilities.browserInfo.name === 'Safari' && capabilities.deviceType === 'mobile') {
      warnings.push('iOS Safari može imati ograničenu camera funkcionalnost');
    }
  }

  /**
   * Dodatne helper funkcije
   */
  private testAdvancedConstraintsSupport(capabilities: any): boolean {
    return !!(capabilities.focusMode || capabilities.zoom || capabilities.exposureMode);
  }

  private detectDeviceType(browserInfo: any): 'desktop' | 'mobile' | 'tablet' {
    if (browserInfo.platform.includes('Mobile')) return 'mobile';
    if (browserInfo.platform.includes('Tablet')) return 'tablet';
    return 'desktop';
  }

  private getEmptyCapabilities(error: string): CameraCapabilities {
    return {
      hasCamera: false,
      hasTorch: false,
      supportedResolutions: [],
      supportsFacingMode: [],
      maxResolution: null,
      deviceType: 'desktop',
      browserInfo: { name: 'Unknown', version: 'Unknown', platform: 'Unknown' },
      constraints: {
        canUseAdvancedConstraints: false,
        canUseTorch: false,
        canUseZoom: false,
        canUseFocus: false
      },
      error
    };
  }

  private getBasicConstraints(): MediaStreamConstraints {
    return {
      video: {
        width: 640,
        height: 480,
        facingMode: "environment"
      }
    };
  }

  /**
   * Cache management
   */
  getCachedDiagnostics(): DiagnosticsResult | null {
    return this.diagnosticsCache;
  }

  clearCache(): void {
    this.diagnosticsCache = null;
  }
}

export const cameraDiagnosticsService = CameraDiagnosticsService.getInstance();