// 🟡 SREDNJI PRIORITET: Performance Monitoring Implementacija

interface PerformanceMetrics {
  renderTime: number;
  queryTime: number;
  componentName: string;
  timestamp: number;
  queryKeys?: string[];
  invalidationCount?: number;
}

class AdminPanelPerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxStoredMetrics = 1000;
  
  // Monitor component render performance
  measureRenderTime<T>(componentName: string, renderFn: () => T): T {
    const startTime = performance.now();
    const result = renderFn();
    const endTime = performance.now();
    
    this.recordMetric({
      renderTime: endTime - startTime,
      queryTime: 0,
      componentName,
      timestamp: Date.now(),
    });
    
    return result;
  }
  
  // Monitor React Query performance
  measureQueryTime(componentName: string, queryKeys: string[], queryTime: number) {
    this.recordMetric({
      renderTime: 0,
      queryTime,
      componentName,
      timestamp: Date.now(),
      queryKeys,
    });
  }
  
  // Track query invalidation frequency
  trackInvalidation(componentName: string, queryKeys: string[]) {
    const recentMetrics = this.metrics.filter(m => 
      m.componentName === componentName && 
      Date.now() - m.timestamp < 60000 // Last minute
    );
    
    const invalidationCount = recentMetrics.filter(m => m.invalidationCount).length + 1;
    
    this.recordMetric({
      renderTime: 0,
      queryTime: 0,
      componentName,
      timestamp: Date.now(),
      queryKeys,
      invalidationCount,
    });
    
    // Warning za excessive invalidations
    if (invalidationCount > 10) {
      console.warn(`⚠️ [PERFORMANCE] ${componentName} has ${invalidationCount} invalidations in the last minute`);
    }
  }
  
  private recordMetric(metric: PerformanceMetrics) {
    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxStoredMetrics) {
      this.metrics = this.metrics.slice(-this.maxStoredMetrics);
    }
  }
  
  // Get performance report
  getPerformanceReport(componentName?: string): {
    averageRenderTime: number;
    averageQueryTime: number;
    totalInvalidations: number;
    slowestQueries: Array<{queryKeys: string[], time: number}>;
    recommendations: string[];
  } {
    const filteredMetrics = componentName 
      ? this.metrics.filter(m => m.componentName === componentName)
      : this.metrics;
    
    if (filteredMetrics.length === 0) {
      return {
        averageRenderTime: 0,
        averageQueryTime: 0,
        totalInvalidations: 0,
        slowestQueries: [],
        recommendations: ['Nema dovoljno podataka za analizu']
      };
    }
    
    const renderTimes = filteredMetrics.filter(m => m.renderTime > 0);
    const queryTimes = filteredMetrics.filter(m => m.queryTime > 0);
    const invalidations = filteredMetrics.filter(m => m.invalidationCount);
    
    const averageRenderTime = renderTimes.length > 0 
      ? renderTimes.reduce((sum, m) => sum + m.renderTime, 0) / renderTimes.length
      : 0;
    
    const averageQueryTime = queryTimes.length > 0
      ? queryTimes.reduce((sum, m) => sum + m.queryTime, 0) / queryTimes.length
      : 0;
    
    const slowestQueries = queryTimes
      .filter(m => m.queryKeys)
      .sort((a, b) => b.queryTime - a.queryTime)
      .slice(0, 5)
      .map(m => ({ queryKeys: m.queryKeys!, time: m.queryTime }));
    
    const recommendations = this.generateRecommendations(averageRenderTime, averageQueryTime, invalidations.length);
    
    return {
      averageRenderTime,
      averageQueryTime,
      totalInvalidations: invalidations.length,
      slowestQueries,
      recommendations
    };
  }
  
  private generateRecommendations(renderTime: number, queryTime: number, invalidations: number): string[] {
    const recommendations: string[] = [];
    
    if (renderTime > 100) {
      recommendations.push('Render time > 100ms - razmotriti React.memo optimizacije');
    }
    
    if (queryTime > 1000) {
      recommendations.push('Query time > 1s - optimizovati backend endpoint ili dodati indekse');
    }
    
    if (invalidations > 20) {
      recommendations.push('Prekomerne query invalidacije - grupisati povezane invalidacije');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Performanse su u prihvatljivom opsegu');
    }
    
    return recommendations;
  }
  
  // Clear metrics for specific component
  clearMetrics(componentName?: string) {
    if (componentName) {
      this.metrics = this.metrics.filter(m => m.componentName !== componentName);
    } else {
      this.metrics = [];
    }
  }
}

// Global instance
export const performanceMonitor = new AdminPanelPerformanceMonitor();

// React hook for easy usage
import { useEffect } from 'react';

export function usePerformanceMonitoring(componentName: string) {
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      performanceMonitor.measureRenderTime(componentName, () => endTime - startTime);
    };
  }, [componentName]);
  
  const trackQueryPerformance = (queryKeys: string[], queryTime: number) => {
    performanceMonitor.measureQueryTime(componentName, queryKeys, queryTime);
  };
  
  const trackInvalidation = (queryKeys: string[]) => {
    performanceMonitor.trackInvalidation(componentName, queryKeys);
  };
  
  return {
    trackQueryPerformance,
    trackInvalidation,
  };
}