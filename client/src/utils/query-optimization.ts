// 🔴 VISOK PRIORITET: React Query Optimizacije - Smaniti sa 31 na 15 invalidacija

import { QueryClient } from '@tanstack/react-query';

// Centralizovane query key konstante za consistency
export const QUERY_KEYS = {
  SERVICES: '/api/admin/services',
  SPARE_PARTS: '/api/admin/spare-parts',
  AVAILABLE_PARTS: '/api/admin/available-parts',
  CLIENTS: '/api/clients',
  TECHNICIANS: '/api/technicians',
  APPLIANCES: '/api/appliances',
  BUSINESS_PARTNERS: '/api/business-partners',
  NOTIFICATIONS: '/api/notifications'
} as const;

// Optimized invalidation strategies
export class QueryInvalidationManager {
  constructor(private queryClient: QueryClient) {}

  // Strategija 1: Batch povezanih invalidacija u jednu operaciju
  invalidateServiceRelated(reason?: string) {
    console.log(`🔄 Batching service-related invalidations: ${reason || 'Service update'}`);
    
    // Umesto 3 odvojene invalidacije, jedna batch operacija
    this.queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0]?.toString();
        return Boolean(key && (
          key === QUERY_KEYS.SERVICES ||
          key === QUERY_KEYS.SPARE_PARTS ||
          key === QUERY_KEYS.NOTIFICATIONS
        ));
      }
    });
  }

  // Strategija 2: Selective invalidation umesto broad invalidations
  invalidateSpecific(queryKey: string, exact = true, staleOnly = false) {
    if (staleOnly) {
      // Samo označi kao stale umesto full invalidation
      this.queryClient.invalidateQueries({ 
        queryKey: [queryKey], 
        exact, 
        refetchType: 'none' 
      });
    } else {
      this.queryClient.invalidateQueries({ queryKey: [queryKey], exact });
    }
  }

  // Strategija 3: Smart invalidation based na data dependencies
  invalidateSmartDependencies(primaryKey: string, data?: any) {
    const dependencies = this.getDependencies(primaryKey);
    
    dependencies.forEach(depKey => {
      // Conditional invalidation - only if data actually changed
      if (this.shouldInvalidate(depKey, data)) {
        this.invalidateSpecific(depKey, true, false);
      }
    });
  }

  private getDependencies(key: string): string[] {
    const dependencyMap: Record<string, string[]> = {
      [QUERY_KEYS.SERVICES]: [QUERY_KEYS.NOTIFICATIONS, QUERY_KEYS.SPARE_PARTS],
      [QUERY_KEYS.SPARE_PARTS]: [QUERY_KEYS.AVAILABLE_PARTS],
      [QUERY_KEYS.CLIENTS]: [QUERY_KEYS.APPLIANCES],
      [QUERY_KEYS.APPLIANCES]: [], // No dependencies
      [QUERY_KEYS.TECHNICIANS]: [QUERY_KEYS.SERVICES],
    };

    return dependencyMap[key] || [];
  }

  private shouldInvalidate(key: string, data: any): boolean {
    // Smart logic za određivanje da li je invalidation potreban
    if (!data) return true;

    // Primer: Ne invalidacije notifications ako se samo notes promenio
    if (key === QUERY_KEYS.NOTIFICATIONS && data.onlyNotesChanged) {
      return false;
    }

    return true;
  }

  // Strategija 4: Debounced invalidations za bulk operations
  private debouncedInvalidations = new Map<string, NodeJS.Timeout>();

  invalidateDebounced(queryKey: string, delay = 500) {
    // Cancel postojeći timeout
    const existingTimeout = this.debouncedInvalidations.get(queryKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set novi timeout
    const timeout = setTimeout(() => {
      this.invalidateSpecific(queryKey);
      this.debouncedInvalidations.delete(queryKey);
    }, delay);

    this.debouncedInvalidations.set(queryKey, timeout);
  }

  // Performance metrics
  getInvalidationStats() {
    const queryCache = this.queryClient.getQueryCache();
    const queries = queryCache.getAll();
    
    return {
      totalQueries: queries.length,
      staleQueries: queries.filter(q => q.isStale()).length,
      fetchingQueries: queries.filter(q => q.isFetching()).length,
      errorQueries: queries.filter(q => q.state.error).length,
    };
  }
}

// Hook za optimized query management
export function useOptimizedQueryInvalidation(queryClient: QueryClient) {
  const manager = new QueryInvalidationManager(queryClient);

  return {
    // Replacement za postojeće queryClient.invalidateQueries pozive
    invalidateServices: (reason?: string) => manager.invalidateServiceRelated(reason),
    invalidateSpecific: (key: string, exact = true) => manager.invalidateSpecific(key, exact),
    invalidateDebounced: (key: string) => manager.invalidateDebounced(key),
    invalidateSmart: (key: string, data?: any) => manager.invalidateSmartDependencies(key, data),
    
    // Performance monitoring
    getStats: () => manager.getInvalidationStats(),
  };
}