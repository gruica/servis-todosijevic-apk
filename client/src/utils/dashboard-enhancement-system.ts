// Dashboard Enhancement System - Redizajnira postojeći Dashboard bez menjanja koda
// Koristi CSS overlay i DOM manipulaciju za moderne Lucide ikone

import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  LayoutDashboard, 
  Users, 
  Wrench, 
  Package, 
  TrendingUp, 
  Activity,
  CheckCircle,
  Clock,
  Eye
} from 'lucide-react';

let isEnhancementActive = false;
let enhancementRoot: any = null;

export function initializeDashboardEnhancement() {
  if (isEnhancementActive) return;
  
  // Čeka da se Dashboard učita
  const checkForDashboard = () => {
    const dashboardElement = document.querySelector('[class*="min-h-screen"]') || 
                            document.querySelector('main') ||
                            document.querySelector('#root > div > div');
    
    if (dashboardElement && window.location.pathname === '/') {
      enhanceDashboard();
    } else {
      setTimeout(checkForDashboard, 500);
    }
  };
  
  checkForDashboard();
}

function enhanceDashboard() {
  if (isEnhancementActive) return;
  
  isEnhancementActive = true;
  
  // Dodaj CSS stilove za poboljšanje
  addEnhancementStyles();
  
  // Poboljšaj postojeće kartice
  enhanceExistingCards();
  
  // Dodaj toggle dugme
  addToggleButton();
  
  console.log('🎨 Dashboard Enhancement System aktiviran sa Lucide ikonama');
}

function addEnhancementStyles() {
  const existingStyle = document.getElementById('dashboard-enhancement-styles');
  if (existingStyle) return;
  
  const style = document.createElement('style');
  style.id = 'dashboard-enhancement-styles';
  style.textContent = `
    /* Dashboard Enhancement Styles */
    .enhanced-dashboard-card {
      background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05)) !important;
      backdrop-filter: blur(10px) !important;
      border: 1px solid rgba(255,255,255,0.2) !important;
      box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37) !important;
      border-radius: 12px !important;
      transition: all 0.3s ease !important;
    }
    
    .enhanced-dashboard-card:hover {
      transform: translateY(-2px) !important;
      box-shadow: 0 12px 40px 0 rgba(31, 38, 135, 0.5) !important;
    }
    
    .enhanced-icon-container {
      width: 48px !important;
      height: 48px !important;
      border-radius: 12px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
    }
    
    .enhanced-blue { background: linear-gradient(135deg, #3B82F6, #1D4ED8) !important; }
    .enhanced-yellow { background: linear-gradient(135deg, #F59E0B, #D97706) !important; }
    .enhanced-green { background: linear-gradient(135deg, #10B981, #059669) !important; }
    .enhanced-orange { background: linear-gradient(135deg, #F97316, #EA580C) !important; }
    
    .enhanced-value {
      font-size: 2rem !important;
      font-weight: 700 !important;
      line-height: 1 !important;
      margin-top: 8px !important;
    }
    
    .enhanced-title {
      font-size: 0.875rem !important;
      font-weight: 500 !important;
      opacity: 0.8 !important;
    }
    
    .dashboard-toggle-btn {
      position: fixed !important;
      top: 20px !important;
      right: 20px !important;
      z-index: 1000 !important;
      background: rgba(255,255,255,0.9) !important;
      backdrop-filter: blur(10px) !important;
      border: 1px solid rgba(255,255,255,0.2) !important;
      border-radius: 8px !important;
      padding: 8px 16px !important;
      font-size: 12px !important;
      font-weight: 500 !important;
      color: #7C3AED !important;
      cursor: pointer !important;
      transition: all 0.3s ease !important;
    }
    
    .dashboard-toggle-btn:hover {
      background: rgba(124,58,237,0.1) !important;
      transform: translateY(-1px) !important;
    }
  `;
  
  document.head.appendChild(style);
}

function enhanceExistingCards() {
  // Pronađi postojeće kartice
  const cards = document.querySelectorAll('[class*="bg-gradient-to-br"]');
  
  cards.forEach((card, index) => {
    if (card.querySelector('.enhanced-icon-container')) return; // Već poboljšano
    
    const cardElement = card as HTMLElement;
    cardElement.classList.add('enhanced-dashboard-card');
    
    // Pronađi postojeće ikone i tekst
    const existingIcon = card.querySelector('[class*="material-icons"]');
    const valueElement = card.querySelector('[class*="text-3xl"], [class*="text-2xl"]');
    const titleElement = card.querySelector('[class*="text-sm"]');
    
    if (existingIcon && valueElement && titleElement) {
      // Sakrij postojeću ikonu
      (existingIcon as HTMLElement).style.display = 'none';
      
      // Kreiraj novi icon container
      const iconContainer = document.createElement('div');
      iconContainer.className = 'enhanced-icon-container';
      
      // Dodeli boju na osnovu indeksa
      const colors = ['enhanced-blue', 'enhanced-yellow', 'enhanced-green', 'enhanced-orange'];
      iconContainer.classList.add(colors[index % colors.length]);
      
      // Dodeli odgovarajuću Lucide ikonu
      const icons = [Wrench, Activity, CheckCircle, Clock];
      const IconComponent = icons[index % icons.length];
      
      // Insertuj nova ikona
      existingIcon.parentElement?.insertBefore(iconContainer, existingIcon);
      
      // Renderuj Lucide ikonu
      const iconRoot = createRoot(iconContainer);
      iconRoot.render(createElement(IconComponent, { 
        size: 24, 
        className: 'text-white' 
      }));
      
      // Poboljšaj stilove teksta
      (valueElement as HTMLElement).classList.add('enhanced-value');
      (titleElement as HTMLElement).classList.add('enhanced-title');
    }
  });
  
  // Poboljšaj table ikone
  enhanceTableIcons();
}

function enhanceTableIcons() {
  const tableIcons = document.querySelectorAll('table [class*="material-icons"]');
  
  tableIcons.forEach((icon) => {
    if (icon.hasAttribute('data-enhanced')) return;
    
    const iconElement = icon as HTMLElement;
    iconElement.setAttribute('data-enhanced', 'true');
    
    // Sakrij postojeću ikonu
    iconElement.style.display = 'none';
    
    // Kreiraj wrapper za Lucide ikonu
    const wrapper = document.createElement('div');
    wrapper.style.display = 'inline-flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.justifyContent = 'center';
    wrapper.style.width = '20px';
    wrapper.style.height = '20px';
    
    iconElement.parentElement?.insertBefore(wrapper, iconElement);
    
    // Renderuj Eye ikonu za dugmad u tabelama
    const iconRoot = createRoot(wrapper);
    iconRoot.render(createElement(Eye, { 
      size: 16, 
      className: 'text-green-600' 
    }));
  });
}

function addToggleButton() {
  if (document.getElementById('dashboard-enhancement-toggle')) return;
  
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'dashboard-enhancement-toggle';
  toggleBtn.className = 'dashboard-toggle-btn';
  toggleBtn.innerHTML = '🎨 Enhanced Design';
  toggleBtn.onclick = deactivateDashboardEnhancement;
  
  document.body.appendChild(toggleBtn);
}

export function deactivateDashboardEnhancement() {
  if (!isEnhancementActive) return;
  
  isEnhancementActive = false;
  
  // Ukloni stilove
  const style = document.getElementById('dashboard-enhancement-styles');
  if (style) style.remove();
  
  // Ukloni toggle dugme
  const toggle = document.getElementById('dashboard-enhancement-toggle');
  if (toggle) toggle.remove();
  
  // Resetuj postojeće kartice
  const enhancedCards = document.querySelectorAll('.enhanced-dashboard-card');
  enhancedCards.forEach(card => {
    card.classList.remove('enhanced-dashboard-card');
    
    // Prikaži originalne ikone
    const hiddenIcons = card.querySelectorAll('[class*="material-icons"][style*="display: none"]');
    hiddenIcons.forEach(icon => {
      (icon as HTMLElement).style.display = '';
    });
    
    // Ukloni dodane icon containere
    const enhancedIcons = card.querySelectorAll('.enhanced-icon-container');
    enhancedIcons.forEach(icon => icon.remove());
  });
  
  // Resetuj table ikone
  const enhancedTableIcons = document.querySelectorAll('table [data-enhanced]');
  enhancedTableIcons.forEach(icon => {
    (icon as HTMLElement).style.display = '';
    icon.removeAttribute('data-enhanced');
    
    // Ukloni dodane wrappere
    const wrapper = icon.previousElementSibling;
    if (wrapper && wrapper.tagName === 'DIV') {
      wrapper.remove();
    }
  });
  
  console.log('🎨 Dashboard Enhancement System deaktiviran');
}

// Auto-inicijalizacija
if (typeof window !== 'undefined') {
  // Prati promene rute
  let currentPath = window.location.pathname;
  
  const checkPathChange = () => {
    if (window.location.pathname !== currentPath) {
      currentPath = window.location.pathname;
      
      if (currentPath === '/' && !isEnhancementActive) {
        setTimeout(initializeDashboardEnhancement, 1000);
      } else if (currentPath !== '/' && isEnhancementActive) {
        deactivateDashboardEnhancement();
      }
    }
  };
  
  setInterval(checkPathChange, 1000);
  
  // Inicijalna proverava
  if (window.location.pathname === '/') {
    setTimeout(initializeDashboardEnhancement, 2000);
  }
}