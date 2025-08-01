import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { EnhancedDashboard } from '@/components/admin/enhanced-dashboard';

interface UseDashboardOverlayProps {
  stats: any;
  isLoading: boolean;
  enrichedApplianceStats: any[];
  getUserInitials: (name: string) => string;
  handleClientDetails: (id: number) => void;
}

export function useDashboardOverlay({
  stats,
  isLoading,
  enrichedApplianceStats,
  getUserInitials,
  handleClientDetails
}: UseDashboardOverlayProps) {
  const [isOverlayActive, setIsOverlayActive] = useState(false);

  useEffect(() => {
    // Proverava da li smo na dashboard stranici
    if (window.location.pathname === '/' || window.location.pathname === '/admin') {
      activateEnhancedDashboard();
    }

    return () => {
      deactivateEnhancedDashboard();
    };
  }, [stats, isLoading, enrichedApplianceStats]);

  const activateEnhancedDashboard = () => {
    if (isOverlayActive) return;

    // Pronađi postojeći dashboard container
    const dashboardContainer = document.querySelector('[data-dashboard-container]') || 
                              document.querySelector('.min-h-screen > div > div') ||
                              document.querySelector('main') ||
                              document.querySelector('#root > div > div');

    if (!dashboardContainer) return;

    // Kreiraj overlay container
    const overlayContainer = document.createElement('div');
    overlayContainer.id = 'enhanced-dashboard-overlay';
    overlayContainer.style.position = 'absolute';
    overlayContainer.style.top = '0';
    overlayContainer.style.left = '0';
    overlayContainer.style.right = '0';
    overlayContainer.style.bottom = '0';
    overlayContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
    overlayContainer.style.backdropFilter = 'blur(2px)';
    overlayContainer.style.zIndex = '10';
    overlayContainer.style.padding = '2rem';
    overlayContainer.style.overflow = 'auto';

    // Dodaj overlay u container
    if (dashboardContainer.parentElement) {
      dashboardContainer.parentElement.style.position = 'relative';
      dashboardContainer.parentElement.appendChild(overlayContainer);
    }

    // Renderuj Enhanced Dashboard
    const root = createRoot(overlayContainer);
    root.render(
      <EnhancedDashboard
        stats={stats}
        isLoading={isLoading}
        enrichedApplianceStats={enrichedApplianceStats}
        getUserInitials={getUserInitials}
        handleClientDetails={handleClientDetails}
      />
    );

    setIsOverlayActive(true);
    console.log('🎨 Enhanced Dashboard aktiviran sa Lucide ikonama');
  };

  const deactivateEnhancedDashboard = () => {
    const overlay = document.getElementById('enhanced-dashboard-overlay');
    if (overlay) {
      overlay.remove();
      setIsOverlayActive(false);
      console.log('🎨 Enhanced Dashboard deaktiviran');
    }
  };

  return {
    isOverlayActive,
    activateEnhancedDashboard,
    deactivateEnhancedDashboard
  };
}