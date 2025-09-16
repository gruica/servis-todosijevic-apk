# Capacitor Build Instructions - Fetch Polyfill Setup

## ✅ STATUS: KOMPLETNO IMPLEMENTIRAN

Fetch polyfill za Capacitor APK autentikaciju je uspešno implementiran u `client/src/lib/queryClient.ts` na linijama 131-163.

## 🔧 Kako polyfill radi

```typescript
// === MOBILE API FIX - fetch polyfill ===
// Problem: Capacitor APK koristi relative URLs koji ne rade  
// Rešenje: Presretni fetch pozive i dodaj API_BASE prefix
const API_BASE = import.meta.env.VITE_API_BASE_URL || 
                 (typeof window !== 'undefined' && (window as any).CAPACITOR_API_BASE) || 
                 "";

// Automatski presreće sve `/api/*` pozive:
window.fetch = (url, options) => {
  if (typeof url === 'string' && url.startsWith('/api/')) {
    const newUrl = `${API_BASE}${url}`;
    console.log(`🔄 API polyfill: ${url} → ${newUrl}`);
    url = newUrl;
  }
  return originalFetch(url, options);
};
```

## 📱 Capacitor Build Process

### 1. Environment varijabla
```bash
# Build za production Capacitor APK:
VITE_API_BASE_URL=https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev npm run build
```

### 2. Alternative opcije
```javascript
// U Capacitor app-u možeš postaviti:
window.CAPACITOR_API_BASE = "https://your-server-url";
```

### 3. Build commands
```bash
# Build frontend sa polyfill-om
npm run build

# Build Android APK
npx cap build android
```

## ✅ Verifikacija

### Console logs:
- **Web dev**: `🌐 Web mod - fetch polyfill neaktivan` ✅
- **APK sa URL**: `🔧 Fetch polyfill aktiviran sa API_BASE: https://...` ✅  
- **APK bez URL**: `📱 Capacitor detected - no API_BASE configured` ⚠️

### API przekierowanie:
- `/api/jwt-login` → `https://replit-url/api/jwt-login`
- `/api/jwt-user` → `https://replit-url/api/jwt-user` 
- `/api/*` → `https://replit-url/api/*`

## 🔥 VAŽNE PREDNOSTI

1. **ZERO CODE CHANGES** - postojeći kod ostaje identičan
2. **MULTIPLE ENVIRONMENT SUPPORT** - 3 načina konfiguracije
3. **AUTO-DETECTION** - prepoznaje Capacitor environment
4. **TRANSPARENT** - svi postojeći API pozivi rade automatski
5. **DEBUG FRIENDLY** - console logs za debugging

## 🚀 Postojeći kod radi identično!

Svi postojeći fetch pozivi u:
- `use-auth.tsx` (login, register, logout)  
- `queryClient.ts` (getQueryFn, apiRequest)
- Bilo kojem komponenti

**Rade identično bez mijenjanja koda!**