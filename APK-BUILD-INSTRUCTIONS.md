# 📱 SERVIS TODOSIJEVIĆ - APK BUILD INSTRUKCIJE

## 🎯 PRODUCTION READY APK - KOMPLETNE INSTRUKCIJE

Ova dokumentacija sadrži sve potrebne korake za kreiranje production APK aplikacije sa svim implementiranim funkcionalnostima uključujući native camera support.

---

## ✅ CURRENT STATUS

**IMPLEMENTIRANE FUNKCIONALNOSTI:**
- ✅ Cross-platform API configuration (tehnikamne.me production server)
- ✅ Native camera support sa @capacitor/camera@7.0.2
- ✅ Offline/online detekciju sa network monitoring
- ✅ Robust error handling sa retry mehanizmima
- ✅ Environment-aware authentication system
- ✅ Photo upload sa base64 integration
- ✅ Native/web compatibility layer
- ✅ Production optimizacije

**CAPACITOR PLUGINS KONFIGURISANI:**
- @capacitor/splash-screen@7.0.1
- @capacitor/status-bar@7.0.1
- @capacitor/device@7.0.1
- @capacitor/preferences@7.0.1
- @capacitor/network@7.0.2
- @capacitor/camera@7.0.2

---

## 🛠️ PREREQUISITES

**Potrebni software:**
- Android Studio (latest version)
- Java JDK 11 ili veći
- Node.js 18+
- Android SDK (API level 30+)

---

## 📋 BUILD KORACI

### 1. KLONIRAJ PROJECT
```bash
git clone <project_repository>
cd servis-todosijevic
```

### 2. INSTALIRAJ DEPENDENCIES
```bash
npm install
```

### 3. BUILD FRONTEND ASSETS
```bash
npm run build
```

### 4. SYNC CAPACITOR PLUGINS
```bash
npx cap sync android
```

### 5. OTVORI U ANDROID STUDIO
```bash
npx cap open android
```

### 6. KONFIGURIRAJ SIGNING KEY (Production)
U Android Studio:
1. Build > Generate Signed Bundle/APK
2. APK
3. Create new keystore ili use existing
4. Sačuvaj keystore detalje BEZBEDNO!

### 7. BUILD APK
U Android Studio:
1. Build > Build Bundle(s)/APK(s) > Build APK(s)
2. Ili koristi Gradle command:
```bash
cd android
./gradlew assembleRelease
```

---

## 🔧 CAPACITOR KONFIGURACIJA

**File: `capacitor.config.ts`**
```typescript
const config: CapacitorConfig = {
  appId: 'com.servistodosijevic.app',
  appName: 'Servis Todosijević',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    url: 'https://tehnikamne.me',
    cleartext: false,
  },
  plugins: {
    SplashScreen: { launchShowDuration: 2000 },
    StatusBar: { backgroundColor: "#1E293B" },
    Camera: { /* Native photo capture */ },
    Network: { /* Offline/online detection */ },
    // ... ostali plugins
  }
};
```

---

## 📸 NATIVE CAMERA IMPLEMENTACIJA

**Key Files:**
- `client/src/utils/nativeCameraUtils.ts` - Native camera wrapper
- `client/src/components/MobilePhotoUploader.tsx` - Photo upload UI
- `client/src/components/MobileServicePhotos.tsx` - Photo management

**Camera Features:**
- Native photo capture sa @capacitor/camera
- Automatic web fallback ako native ne radi
- Permission handling
- Cross-platform compatibility
- Base64 upload integration

---

## 🌐 API KONFIGURACIJA

**Production Server:** `https://tehnikamne.me`

**Environment Detection:**
- Automatski detektuje production/development
- Koristi tehnikamne.me za production builds
- Fallback na local development ako je potreban

**Key Files:**
- `shared/runtime-config.ts` - Environment configuration
- `client/src/lib/queryClient.ts` - API gateway
- `client/src/hooks/use-auth.tsx` - Authentication

---

## 🔐 SECURITY FEATURES

- HTTPS only za production
- JWT authentication sa 30-day expiration
- Cross-platform session management
- API request retry sa exponential backoff
- Secure native storage integration

---

## 🧪 TESTING CHECKLIST

Prije production release testiraj:

**Basic Functionality:**
- [ ] User login/logout
- [ ] Service creation i management
- [ ] Photo upload (camera i gallery)
- [ ] Offline/online transitions
- [ ] API communication

**Camera Features:**
- [ ] Native camera capture
- [ ] Gallery selection
- [ ] Permission requests
- [ ] Web fallback functionality

**Network Handling:**
- [ ] Offline mode detection
- [ ] Auto-retry na reconnect
- [ ] Error handling
- [ ] API timeout recovery

---

## 📦 APK OUTPUT

**Debug APK Location:**
`android/app/build/outputs/apk/debug/app-debug.apk`

**Release APK Location:**
`android/app/build/outputs/apk/release/app-release.apk`

---

## 🚀 DEPLOYMENT CHECKLIST

Pre finalne distribucije:

- [ ] Test na najmanje 3 različita Android uređaja
- [ ] Test sve camera funcionalnosti
- [ ] Test offline/online transitions
- [ ] Verify production API connectivity
- [ ] Test autentifikaciju i session management
- [ ] Performance testing (loading times, memory usage)
- [ ] Battery usage optimization check

---

## 🆘 TROUBLESHOOTING

**Common Issues:**

1. **Camera ne radi:**
   - Proverava permission u AndroidManifest.xml
   - Testa web fallback functionality

2. **API connection fails:**
   - Verifikuje tehnikamne.me server status
   - Proverava network permissions

3. **Build fails:**
   - Clear gradle cache: `./gradlew clean`
   - Re-sync: `npx cap sync android`

---

## 📞 SUPPORT

Za technical support:
- GitHub Issues: [Repository Link]
- Email: tech-support@servistodosijevic.com

---

**DOCUMENT VERSION:** 2025.1.0  
**LAST UPDATED:** September 24, 2025  
**BUILD STATUS:** ✅ Production Ready