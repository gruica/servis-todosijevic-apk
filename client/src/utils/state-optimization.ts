// 🔴 VISOK PRIORITET: State Management Optimizacija - useReducer za complex state

import { useReducer, useCallback, useMemo } from 'react';

// Optimized filter state management
export interface OptimizedFilterState {
  searchQuery: string;
  statusFilter: string;
  technicianFilter: string;
  partnerFilter: string;
  pickupFilter: string;
  cityFilter: string;
  dateRange: {
    from?: Date;
    to?: Date;
  };
}

type FilterAction = 
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_STATUS'; payload: string }
  | { type: 'SET_TECHNICIAN'; payload: string }
  | { type: 'SET_PARTNER'; payload: string }
  | { type: 'SET_PICKUP'; payload: string }
  | { type: 'SET_CITY'; payload: string }
  | { type: 'SET_DATE_RANGE'; payload: { from?: Date; to?: Date } }
  | { type: 'RESET_ALL' }
  | { type: 'RESET_FILTERS_ONLY' };

const filterReducer = (state: OptimizedFilterState, action: FilterAction): OptimizedFilterState => {
  switch (action.type) {
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.payload };
    case 'SET_STATUS':
      return { ...state, statusFilter: action.payload };
    case 'SET_TECHNICIAN':
      return { ...state, technicianFilter: action.payload };
    case 'SET_PARTNER':
      return { ...state, partnerFilter: action.payload };
    case 'SET_PICKUP':
      return { ...state, pickupFilter: action.payload };
    case 'SET_CITY':
      return { ...state, cityFilter: action.payload };
    case 'SET_DATE_RANGE':
      return { ...state, dateRange: action.payload };
    case 'RESET_FILTERS_ONLY':
      return {
        ...state,
        statusFilter: 'all',
        technicianFilter: 'all',
        partnerFilter: 'all',
        pickupFilter: 'all',
        cityFilter: 'all',
        dateRange: {}
      };
    case 'RESET_ALL':
      return {
        searchQuery: '',
        statusFilter: 'all',
        technicianFilter: 'all',
        partnerFilter: 'all',
        pickupFilter: 'all',
        cityFilter: 'all',
        dateRange: {}
      };
    default:
      return state;
  }
};

// Optimized dialog state management
export interface OptimizedDialogState {
  selectedItem: any;
  activeDialog: 'none' | 'details' | 'edit' | 'delete' | 'return' | 'spare_parts' | 'custom';
  formData: Record<string, any>;
  loading: boolean;
  error?: string;
}

type DialogAction = 
  | { type: 'OPEN_DIALOG'; payload: { dialog: string; item?: any; formData?: Record<string, any> } }
  | { type: 'CLOSE_ALL' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload?: string }
  | { type: 'UPDATE_FORM'; payload: Record<string, any> };

const dialogReducer = (state: OptimizedDialogState, action: DialogAction): OptimizedDialogState => {
  switch (action.type) {
    case 'OPEN_DIALOG':
      return {
        ...state,
        activeDialog: action.payload.dialog as any,
        selectedItem: action.payload.item || state.selectedItem,
        formData: action.payload.formData || {},
        error: undefined
      };
    case 'CLOSE_ALL':
      return {
        selectedItem: null,
        activeDialog: 'none',
        formData: {},
        loading: false,
        error: undefined
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'UPDATE_FORM':
      return { 
        ...state, 
        formData: { ...state.formData, ...action.payload } 
      };
    default:
      return state;
  }
};

// Optimized hook za filter management
export function useOptimizedFilters(initialState?: Partial<OptimizedFilterState>) {
  const [state, dispatch] = useReducer(filterReducer, {
    searchQuery: '',
    statusFilter: 'all',
    technicianFilter: 'all',
    partnerFilter: 'all',
    pickupFilter: 'all',
    cityFilter: 'all',
    dateRange: {},
    ...initialState
  });

  // Memoized filter functions za performance
  const filterFunctions = useMemo(() => ({
    setSearch: (value: string) => dispatch({ type: 'SET_SEARCH', payload: value }),
    setStatus: (value: string) => dispatch({ type: 'SET_STATUS', payload: value }),
    setTechnician: (value: string) => dispatch({ type: 'SET_TECHNICIAN', payload: value }),
    setPartner: (value: string) => dispatch({ type: 'SET_PARTNER', payload: value }),
    setPickup: (value: string) => dispatch({ type: 'SET_PICKUP', payload: value }),
    setCity: (value: string) => dispatch({ type: 'SET_CITY', payload: value }),
    setDateRange: (range: { from?: Date; to?: Date }) => 
      dispatch({ type: 'SET_DATE_RANGE', payload: range }),
    resetFilters: () => dispatch({ type: 'RESET_FILTERS_ONLY' }),
    resetAll: () => dispatch({ type: 'RESET_ALL' })
  }), []);

  // Active filters count za UI
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (state.searchQuery) count++;
    if (state.statusFilter !== 'all') count++;
    if (state.technicianFilter !== 'all') count++;
    if (state.partnerFilter !== 'all') count++;
    if (state.pickupFilter !== 'all') count++;
    if (state.cityFilter !== 'all') count++;
    if (state.dateRange.from || state.dateRange.to) count++;
    return count;
  }, [state]);

  return {
    filters: state,
    ...filterFunctions,
    activeFiltersCount,
    hasActiveFilters: activeFiltersCount > 0
  };
}

// Optimized hook za dialog management
export function useOptimizedDialogs() {
  const [state, dispatch] = useReducer(dialogReducer, {
    selectedItem: null,
    activeDialog: 'none',
    formData: {},
    loading: false
  });

  const dialogActions = useMemo(() => ({
    openDetails: (item: any) => 
      dispatch({ type: 'OPEN_DIALOG', payload: { dialog: 'details', item } }),
    openEdit: (item: any, formData?: Record<string, any>) => 
      dispatch({ type: 'OPEN_DIALOG', payload: { dialog: 'edit', item, formData } }),
    openDelete: (item: any) => 
      dispatch({ type: 'OPEN_DIALOG', payload: { dialog: 'delete', item } }),
    openReturn: (item: any) => 
      dispatch({ type: 'OPEN_DIALOG', payload: { dialog: 'return', item } }),
    openSpareParts: (item: any) => 
      dispatch({ type: 'OPEN_DIALOG', payload: { dialog: 'spare_parts', item } }),
    openCustom: (dialogType: string, item?: any, formData?: Record<string, any>) => 
      dispatch({ type: 'OPEN_DIALOG', payload: { dialog: dialogType, item, formData } }),
    closeAll: () => dispatch({ type: 'CLOSE_ALL' }),
    setLoading: (loading: boolean) => dispatch({ type: 'SET_LOADING', payload: loading }),
    setError: (error?: string) => dispatch({ type: 'SET_ERROR', payload: error }),
    updateForm: (data: Record<string, any>) => dispatch({ type: 'UPDATE_FORM', payload: data })
  }), []);

  return {
    dialog: state,
    ...dialogActions,
    isOpen: state.activeDialog !== 'none',
    isLoading: state.loading
  };
}

// Performance monitoring za state updates
export function useStatePerformanceMonitor(componentName: string) {
  const renderCount = useMemo(() => {
    let count = 0;
    return () => ++count;
  }, []);

  const logStateUpdate = useCallback((stateName: string, newState: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 [${componentName}] State update: ${stateName}`, {
        renderCount: renderCount(),
        newState,
        timestamp: new Date().toISOString()
      });
    }
  }, [componentName, renderCount]);

  return { logStateUpdate, renderCount };
}