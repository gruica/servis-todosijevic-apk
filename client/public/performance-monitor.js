// Performance Monitor - Frigo Sistem Todosijević 2025
// Advanced monitoring za Core Web Vitals i user experience

(function() {
  'use strict';

  // Konfiguracija
  const config = {
    sampleRate: 0.1, // 10% uzoraka za production
    maxRetries: 3,
    batchSize: 10,
    flushInterval: 30000, // 30 sekundi
    endpoint: '/api/analytics/performance'
  };

  // Batch queue za metrics
  let metricsQueue = [];
  let retryCount = 0;

  // Device info
  const deviceInfo = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    screenWidth: screen.width,
    screenHeight: screen.height,
    colorDepth: screen.colorDepth,
    pixelRatio: window.devicePixelRatio || 1,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };

  // Connection info (ako je dostupno)
  const connectionInfo = navigator.connection ? {
    effectiveType: navigator.connection.effectiveType,
    downlink: navigator.connection.downlink,
    rtt: navigator.connection.rtt,
    saveData: navigator.connection.saveData
  } : {};

  // Utility funkcije
  function round(num, digits = 2) {
    return Math.round(num * Math.pow(10, digits)) / Math.pow(10, digits);
  }

  function now() {
    return Date.now();
  }

  function shouldSample() {
    return Math.random() < config.sampleRate;
  }

  // Metrics collection
  function addMetric(metric) {
    if (!shouldSample()) return;

    const enhancedMetric = {
      ...metric,
      timestamp: now(),
      sessionId: getSessionId(),
      pageUrl: window.location.href,
      referrer: document.referrer,
      device: deviceInfo,
      connection: connectionInfo
    };

    metricsQueue.push(enhancedMetric);

    if (metricsQueue.length >= config.batchSize) {
      flushMetrics();
    }
  }

  // Session management
  function getSessionId() {
    let sessionId = sessionStorage.getItem('frigo_session_id');
    if (!sessionId) {
      sessionId = 'fs_' + Math.random().toString(36).substr(2, 9) + '_' + now();
      sessionStorage.setItem('frigo_session_id', sessionId);
    }
    return sessionId;
  }

  // Metrics flushing
  function flushMetrics() {
    if (metricsQueue.length === 0) return;

    const payload = {
      metrics: [...metricsQueue],
      meta: {
        version: '2025.1.0',
        source: 'frigo-performance-monitor'
      }
    };

    metricsQueue = [];

    // Use sendBeacon ako je dostupan (ne blokira page unload)
    if (navigator.sendBeacon) {
      const success = navigator.sendBeacon(
        config.endpoint, 
        JSON.stringify(payload)
      );
      if (!success && retryCount < config.maxRetries) {
        retryWithFetch(payload);
      }
    } else {
      retryWithFetch(payload);
    }
  }

  function retryWithFetch(payload) {
    fetch(config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(error => {
      console.warn('📊 Performance metrics failed to send:', error);
      retryCount++;
      
      if (retryCount < config.maxRetries) {
        setTimeout(() => retryWithFetch(payload), 1000 * retryCount);
      }
    });
  }

  // Core Web Vitals monitoring
  
  // LCP - Largest Contentful Paint
  function observeLCP() {
    try {
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        addMetric({
          name: 'LCP',
          value: round(lastEntry.startTime),
          rating: getRating(lastEntry.startTime, [2500, 4000]),
          element: lastEntry.element ? lastEntry.element.tagName : 'unknown',
          size: lastEntry.size,
          url: lastEntry.url
        });
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
      console.warn('LCP monitoring failed:', e);
    }
  }

  // INP - Interaction to Next Paint (zamenjuje FID)
  function observeINP() {
    try {
      new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (entry.interactionId) {
            const inp = entry.processingEnd - entry.startTime;
            
            addMetric({
              name: 'INP',
              value: round(inp),
              rating: getRating(inp, [200, 500]),
              type: entry.name,
              target: entry.target ? entry.target.tagName : 'unknown'
            });
          }
        }
      }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
    } catch (e) {
      console.warn('INP monitoring failed:', e);
    }
  }

  // CLS - Cumulative Layout Shift
  function observeCLS() {
    try {
      let clsValue = 0;
      let clsEntries = [];

      new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            clsEntries.push({
              value: entry.value,
              sources: entry.sources?.map(source => ({
                element: source.node?.tagName || 'unknown',
                previousRect: source.previousRect,
                currentRect: source.currentRect
              }))
            });
          }
        }

        addMetric({
          name: 'CLS',
          value: round(clsValue),
          rating: getRating(clsValue, [0.1, 0.25]),
          entries: clsEntries.slice(-5) // Poslednje 5 entries
        });
      }).observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      console.warn('CLS monitoring failed:', e);
    }
  }

  // TTFB - Time to First Byte
  function observeTTFB() {
    try {
      new PerformanceObserver((entryList) => {
        const [entry] = entryList.getEntries();
        const ttfb = entry.responseStart - entry.requestStart;

        addMetric({
          name: 'TTFB',
          value: round(ttfb),
          rating: getRating(ttfb, [800, 1800]),
          protocol: entry.nextHopProtocol,
          transferSize: entry.transferSize,
          encodedBodySize: entry.encodedBodySize
        });
      }).observe({ type: 'navigation', buffered: true });
    } catch (e) {
      console.warn('TTFB monitoring failed:', e);
    }
  }

  // FCP - First Contentful Paint
  function observeFCP() {
    try {
      new PerformanceObserver((entryList) => {
        const [entry] = entryList.getEntries();
        
        addMetric({
          name: 'FCP',
          value: round(entry.startTime),
          rating: getRating(entry.startTime, [1800, 3000])
        });
      }).observe({ type: 'paint', buffered: true });
    } catch (e) {
      console.warn('FCP monitoring failed:', e);
    }
  }

  // Custom metrics
  function observeResourceTiming() {
    try {
      new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          // Track samo kritičke resurse
          if (entry.name.includes('.js') || entry.name.includes('.css') || 
              entry.name.includes('/api/')) {
            
            addMetric({
              name: 'RESOURCE_TIMING',
              resource: entry.name,
              duration: round(entry.duration),
              size: entry.transferSize,
              type: entry.initiatorType,
              rating: getRating(entry.duration, [500, 1000])
            });
          }
        }
      }).observe({ type: 'resource', buffered: true });
    } catch (e) {
      console.warn('Resource timing monitoring failed:', e);
    }
  }

  // JavaScript errors tracking
  function observeErrors() {
    window.addEventListener('error', (event) => {
      addMetric({
        name: 'JS_ERROR',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      addMetric({
        name: 'PROMISE_REJECTION',
        reason: event.reason?.toString(),
        stack: event.reason?.stack
      });
    });
  }

  // Rating helper
  function getRating(value, thresholds) {
    if (value <= thresholds[0]) return 'good';
    if (value <= thresholds[1]) return 'needs-improvement';
    return 'poor';
  }

  // User engagement tracking
  function trackEngagement() {
    let startTime = now();
    let isVisible = !document.hidden;
    let totalVisibleTime = 0;
    let interactionCount = 0;

    // Track visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && isVisible) {
        totalVisibleTime += now() - startTime;
        isVisible = false;
      } else if (!document.hidden && !isVisible) {
        startTime = now();
        isVisible = true;
      }
    });

    // Track interactions
    ['click', 'scroll', 'keydown'].forEach(event => {
      document.addEventListener(event, () => {
        interactionCount++;
      }, { passive: true });
    });

    // Report engagement na page unload
    window.addEventListener('beforeunload', () => {
      if (isVisible) {
        totalVisibleTime += now() - startTime;
      }

      addMetric({
        name: 'USER_ENGAGEMENT',
        visibleTime: round(totalVisibleTime / 1000), // u sekundama
        interactionCount,
        bounceRate: interactionCount === 0 ? 1 : 0
      });

      flushMetrics();
    });
  }

  // Initialize monitoring
  function init() {
    console.log('📊 Performance monitoring initialized - v2025.1.0');

    // Core Web Vitals
    observeLCP();
    observeINP();
    observeCLS();
    observeTTFB();
    observeFCP();

    // Additional monitoring
    observeResourceTiming();
    observeErrors();
    trackEngagement();

    // Periodic flush
    setInterval(flushMetrics, config.flushInterval);

    // Flush on page unload
    window.addEventListener('beforeunload', flushMetrics);
  }

  // Start monitoring kada je DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose za debugging (samo u dev mode)
  if (window.location.hostname.includes('replit.dev')) {
    window.frigoPerformanceMonitor = {
      flushMetrics,
      getQueue: () => [...metricsQueue],
      config
    };
  }

})();