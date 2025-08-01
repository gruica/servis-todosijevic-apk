// Icon Overlay System - Zamenjuje Material Icons bez diranja postojećih kodova
// Ovaj sistem automatski detektuje Material Icons elemente i overlay-uje ih sa Lucide ikonama

import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { IconMapper } from '@/components/ui/icon-mapper';

// Mapiranje Material Icons naziva na odgovarajuće Lucide nazive
const iconMapping = {
  'dashboard': 'dashboard',
  'person': 'person', 
  'build': 'build',
  'package': 'package',
  'groups': 'groups',
  'business': 'business',
  'inventory': 'inventory',
  'warehouse': 'warehouse',
  'category': 'category',
  'travel_explore': 'travel_explore',
  'home_repair_service': 'home_repair_service',
  'admin_panel_settings': 'admin_panel_settings',
  'verified_user': 'verified_user',
  'smartphone': 'smartphone',
  'message': 'message',
  'mail': 'mail',
  'mail_outline': 'mail_outline',
  'storage': 'storage',
  'import_export': 'import_export',
  'download': 'download',
  'cleaning_services': 'cleaning_services',
  'euro': 'euro',
  'account_circle': 'account_circle'
};

let isSystemActive = false;

// Funkcija za inicijalizaciju overlay sistema
export function initializeIconOverlaySystem() {
  if (isSystemActive) return;
  
  isSystemActive = true;
  
  // Observer za dinamički dodane elemente
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          processElement(node as Element);
        }
      });
    });
  });
  
  // Pokreni observer
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Procesuiraj postojeće elemente
  processExistingElements();
  
  console.log('🎯 Icon Overlay System aktiviran - Material Icons → Lucide React');
}

// Procesuiraj postojeće Material Icons elemente
function processExistingElements() {
  const materialIcons = document.querySelectorAll('.material-icons');
  materialIcons.forEach(processElement);
}

// Procesuiraj pojedinačni element
function processElement(element: Element) {
  if (element.classList.contains('material-icons') && !element.hasAttribute('data-overlay-processed')) {
    replaceMaterialIcon(element as HTMLElement);
  }
  
  // Procesuiraj i decu elementi
  const childMaterialIcons = element.querySelectorAll('.material-icons:not([data-overlay-processed])');
  childMaterialIcons.forEach(child => replaceMaterialIcon(child as HTMLElement));
}

// Zameni Material Icon sa Lucide overlay-om
function replaceMaterialIcon(iconElement: HTMLElement) {
  const iconName = iconElement.textContent?.trim();
  
  if (!iconName || !iconMapping[iconName as keyof typeof iconMapping]) {
    return;
  }
  
  // Označi da je obrađen
  iconElement.setAttribute('data-overlay-processed', 'true');
  
  // Sakrij originalni tekst
  iconElement.style.fontSize = '0';
  iconElement.style.color = 'transparent';
  iconElement.style.position = 'relative';
  iconElement.style.display = 'inline-flex';
  iconElement.style.alignItems = 'center';
  iconElement.style.justifyContent = 'center';
  
  // Kreiraj wrapper za Lucide ikonu
  const overlayContainer = document.createElement('div');
  overlayContainer.style.position = 'absolute';
  overlayContainer.style.top = '50%';
  overlayContainer.style.left = '50%';
  overlayContainer.style.transform = 'translate(-50%, -50%)';
  overlayContainer.style.pointerEvents = 'none';
  overlayContainer.className = 'lucide-overlay';
  
  // Dodaj overlay container u Material Icons element
  iconElement.appendChild(overlayContainer);
  
  // Kreiraj React root i renderuj Lucide ikonu
  const root = createRoot(overlayContainer);
  const iconProps = {
    iconName: iconMapping[iconName as keyof typeof iconMapping],
    size: 20,
    className: getComputedStyle(iconElement).color ? `text-current` : ''
  };
  
  root.render(createElement(IconMapper, iconProps));
  
  console.log(`🔄 Zamenjen "${iconName}" → Lucide React ikona`);
}

// Deaktiviraj sistem (ako je potrebno)
export function deactivateIconOverlaySystem() {
  isSystemActive = false;
  
  // Ukloni sve overlay-e
  const overlays = document.querySelectorAll('.lucide-overlay');
  overlays.forEach(overlay => overlay.remove());
  
  // Resetuj Material Icons elemente
  const processedIcons = document.querySelectorAll('[data-overlay-processed]');
  processedIcons.forEach((icon: Element) => {
    const htmlIcon = icon as HTMLElement;
    htmlIcon.style.fontSize = '';
    htmlIcon.style.color = '';
    htmlIcon.style.position = '';
    htmlIcon.style.display = '';
    htmlIcon.style.alignItems = '';
    htmlIcon.style.justifyContent = '';
    htmlIcon.removeAttribute('data-overlay-processed');
  });
  
  console.log('🔄 Icon Overlay System deaktiviran');
}

// Auto-inicijalizacija kada se DOM učita
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeIconOverlaySystem);
  } else {
    // DOM je već učitan
    setTimeout(initializeIconOverlaySystem, 100);
  }
}