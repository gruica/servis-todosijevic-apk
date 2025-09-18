import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { AuthProvider } from "@/hooks/use-auth";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

// Import Icon Overlay System za automatsku zamenu Material Icons → Lucide React
import "@/utils/icon-overlay-system";

// Import Dashboard Enhancement System za redizajn Dashboard-a sa Lucide ikonama
import "@/utils/dashboard-enhancement-system";

// Import Web Vitals Throttler za performance optimizaciju
import { webVitalsThrottler } from "@/lib/web-vitals-throttler";

// === WEB VITALS PERFORMANCE MONITORING SISTEM ===
// Implementira throttling i batch processing za web vitals pozive
console.log('📊 Performance monitoring initialized - v2025.1.0');

// Web vitals interceptor sa throttling-om
if (typeof window !== 'undefined' && 'performance' in window && 'PerformanceObserver' in window) {
  try {
    // LCP (Largest Contentful Paint) observer
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        webVitalsThrottler.sendMetric({
          name: 'LCP',
          value: entry.startTime,
          id: Math.random().toString(36).substring(2),
          delta: 0,
          isFinal: true
        });
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });

    // FID (First Input Delay) observer
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        webVitalsThrottler.sendMetric({
          name: 'FID',
          value: entry.processingStart - entry.startTime,
          id: Math.random().toString(36).substring(2),
          delta: 0,
          isFinal: true
        });
      }
    }).observe({ type: 'first-input', buffered: true });

    // CLS (Cumulative Layout Shift) observer
    new PerformanceObserver((entryList) => {
      let clsValue = 0;
      for (const entry of entryList.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      if (clsValue > 0) {
        webVitalsThrottler.sendMetric({
          name: 'CLS',
          value: clsValue,
          id: Math.random().toString(36).substring(2),
          delta: 0,
          isFinal: true
        });
      }
    }).observe({ type: 'layout-shift', buffered: true });

    // Navigation timing (TTFB, FCP)
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        const navEntry = entry as PerformanceNavigationTiming;
        
        // TTFB (Time to First Byte)
        webVitalsThrottler.sendMetric({
          name: 'TTFB',
          value: navEntry.responseStart - navEntry.fetchStart,
          id: Math.random().toString(36).substring(2),
          delta: 0,
          isFinal: true
        });
      }
    }).observe({ type: 'navigation', buffered: true });

    // FCP (First Contentful Paint) observer
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          webVitalsThrottler.sendMetric({
            name: 'FCP',
            value: entry.startTime,
            id: Math.random().toString(36).substring(2),
            delta: 0,
            isFinal: true
          });
        }
      }
    }).observe({ type: 'paint', buffered: true });

    console.log('✅ Web vitals observers aktivirani sa throttling sistemom');
  } catch (error) {
    console.warn('⚠️ Web vitals observers greška:', error);
  }
}

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <App />
    </AuthProvider>
  </QueryClientProvider>
);
