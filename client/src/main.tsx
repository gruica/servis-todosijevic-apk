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

// PWA Manager inicijalizacija
import { initializePWA } from "@/lib/pwa-manager";

console.log('📊 Performance monitoring initialized - v2025.1.0');

// Inicijalizuj PWA funkcionalnost
console.log('📱 Inicijalizujem PWA funkcionalnost...');
initializePWA();

// PWA Event Listeners
window.addEventListener('pwa-installable', () => {
  console.log('📱 PWA aplikacija je spremna za instalaciju');
});

window.addEventListener('pwa-installed', () => {
  console.log('✅ PWA aplikacija je uspešno instalirana');
});

window.addEventListener('pwa-update-available', () => {
  console.log('📱 Dostupno je ažuriranje PWA aplikacije');
  showUpdateNotification();
});

function showUpdateNotification() {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Servis Todosijević', {
      body: 'Nova verzija aplikacije je dostupna. Reload-uj stranicu za ažuriranje.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'app-update',
      requireInteraction: true
    });
  } else {
    console.log('✅ Nova verzija aplikacije je dostupna - reload stranicu za ažuriranje');
  }
}

// Offline/Online indikatori
window.addEventListener('online', () => {
  console.log('🌐 Aplikacija je ponovo online');
  document.body.classList.remove('offline');
  document.body.classList.add('online');
});

window.addEventListener('offline', () => {
  console.log('📴 Aplikacija je offline');
  document.body.classList.remove('online');  
  document.body.classList.add('offline');
});

// Inicijalna provera online statusa
if (navigator.onLine) {
  document.body.classList.add('online');
} else {
  document.body.classList.add('offline');
}

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <App />
    </AuthProvider>
  </QueryClientProvider>
);
