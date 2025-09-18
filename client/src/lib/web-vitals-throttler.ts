// Web Vitals Throttling System - Frigo Sistem Todosijević 2025
// Implementira sampling, debouncing i batch processing za web vitals pozive

interface WebVitalMetric {
  name: string;
  value: number;
  id: string;
  delta: number;
  isFinal?: boolean;
}

interface WebVitalsBatch {
  metrics: WebVitalMetric[];
  timestamp: number;
  userAgent?: string;
  url?: string;
  sessionId?: string;
}

class WebVitalsThrottler {
  private sentMetrics = new Set<string>();
  private sampleRate = 0.1; // Only 10% of metrics - drastično smanjuje pozive
  private debounceTime = 2000; // 2 seconds debounce
  private debounceTimeout?: number;
  private pendingMetrics: WebVitalMetric[] = [];
  private maxBatchSize = 5; // Maksimalno 5 metrike po batch-u
  private isEnabled = true;
  
  constructor() {
    // Prilagodi sample rate na osnovu environment-a
    if (import.meta.env.DEV) {
      this.sampleRate = 0.01; // Još manje u development-u
      console.log('🎯 Web Vitals Throttler inicijalizovan (dev mode)');
    } else {
      console.log('📊 Web Vitals Throttler inicijalizovan - sample rate:', this.sampleRate);
    }
  }

  sendMetric(metric: WebVitalMetric) {
    if (!this.isEnabled) return;

    // Skip u development-u - samo log
    if (import.meta.env.DEV) {
      console.log('📈 Web Vitals (dev):', {
        name: metric.name,
        value: Math.round(metric.value * 100) / 100,
        id: metric.id.substring(0, 8)
      });
      return;
    }

    // Sample rate check - drastično smanjuje broj poziva
    if (Math.random() > this.sampleRate) {
      return;
    }

    // Samo finalne metrike
    if (!metric.isFinal) {
      return;
    }

    // Duplicate prevention sa grouping
    const key = `${metric.name}_${Math.floor(metric.value / 100) * 100}`;
    if (this.sentMetrics.has(key)) {
      return;
    }

    this.sentMetrics.add(key);
    this.addToBatch(metric);
  }

  private addToBatch(metric: WebVitalMetric) {
    this.pendingMetrics.push(metric);
    
    // Flush odmah ako je batch pun
    if (this.pendingMetrics.length >= this.maxBatchSize) {
      this.flushBatch();
      return;
    }
    
    // Inače debounce
    clearTimeout(this.debounceTimeout);
    this.debounceTimeout = window.setTimeout(() => {
      this.flushBatch();
    }, this.debounceTime);
  }

  private async flushBatch() {
    if (this.pendingMetrics.length === 0) return;

    const metricsToSend = [...this.pendingMetrics];
    this.pendingMetrics = []; // Clear pending odmah

    const batch: WebVitalsBatch = {
      metrics: metricsToSend,
      timestamp: Date.now(),
      userAgent: navigator.userAgent.substring(0, 100), // Ograniči dužinu
      url: window.location.pathname,
      sessionId: this.getSessionId()
    };

    try {
      console.log('📤 Šalje web vitals batch:', metricsToSend.length, 'metrike');
      
      await fetch('/api/analytics/web-vitals', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Web-Vitals-Batch': 'true'
        },
        body: JSON.stringify(batch)
      });

      console.log('✅ Web vitals batch poslat uspešno');
    } catch (error) {
      console.warn('❌ Failed to send web vitals batch:', error);
      
      // Retry logika - dodaj nazad u pending sa eksponencijalnim backoff
      setTimeout(() => {
        if (this.pendingMetrics.length < this.maxBatchSize) {
          this.pendingMetrics.unshift(...metricsToSend.slice(0, this.maxBatchSize - this.pendingMetrics.length));
        }
      }, 5000); // Retry after 5 seconds
    }

    // Clear timeout
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = undefined;
    }
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('webvitals_session_id');
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('webvitals_session_id', sessionId);
    }
    return sessionId;
  }

  // Public API za kontrolu
  disable() {
    this.isEnabled = false;
    console.log('🚫 Web Vitals Throttler disabled');
  }

  enable() {
    this.isEnabled = true;
    console.log('✅ Web Vitals Throttler enabled');
  }

  setSampleRate(rate: number) {
    this.sampleRate = Math.max(0, Math.min(1, rate));
    console.log('📊 Web Vitals sample rate changed to:', this.sampleRate);
  }

  // Force flush za testing
  forceFlush() {
    if (this.pendingMetrics.length > 0) {
      this.flushBatch();
    }
  }

  getStats() {
    return {
      sampleRate: this.sampleRate,
      pendingMetrics: this.pendingMetrics.length,
      sentMetrics: this.sentMetrics.size,
      isEnabled: this.isEnabled
    };
  }
}

// Singleton instanca
export const webVitalsThrottler = new WebVitalsThrottler();

// Global API za debugging
if (typeof window !== 'undefined') {
  (window as any).webVitalsThrottler = webVitalsThrottler;
}