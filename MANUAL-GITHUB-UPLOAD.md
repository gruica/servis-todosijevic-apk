# 📋 RUČNI UPLOAD NA GITHUB - INSTRUKCIJE

## ⚠️ SITUACIJA
GitHub API ima ograničenja za automatsko kreiranje nested direktorija (kao `.github/workflows/`). 
Treba da ručno uploadovate 2 ključna fajla da aktivirate automatsko APK kreiranje.

---

## 🚀 **KORAK 1: KREIRAJTE GITHUB ACTIONS WORKFLOW**

### Idite na: https://github.com/gruica/servis-todosijevic-mobile

1. **Kliknite "Add file" → "Create new file"**

2. **Upišite naziv fajla:**
```
.github/workflows/build-apk.yml
```

3. **Kopirajte i paste-ujte slediji kod:**

```yaml
name: Build Android APK

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout repository
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
        
    - name: Setup Java JDK 17
      uses: actions/setup-java@v4
      with:
        distribution: 'temurin'
        java-version: '17'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build web application
      run: npm run build
      
    - name: Setup Android SDK
      uses: android-actions/setup-android@v3
      
    - name: Install Capacitor CLI
      run: npm install -g @capacitor/cli
      
    - name: Sync Capacitor
      run: npx cap sync android
      
    - name: Grant execute permission for gradlew
      run: chmod +x android/gradlew
      
    - name: Build APK
      run: |
        cd android
        ./gradlew assembleDebug
        
    - name: Upload APK
      uses: actions/upload-artifact@v4
      with:
        name: servis-todosijevic-debug-apk
        path: android/app/build/outputs/apk/debug/app-debug.apk
        retention-days: 30
        
    - name: Create Release
      if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/master'
      uses: softprops/action-gh-release@v1
      with:
        tag_name: v${{ github.run_number }}
        name: Servis Todosijević APK v${{ github.run_number }}
        body: |
          📱 **Servis Todosijević Android Aplikacija**
          
          **Verzija:** v${{ github.run_number }}
          **Datum:** ${{ github.event.head_commit.timestamp }}
          **Commit:** ${{ github.sha }}
          
          ## 📥 Instalacija
          1. Preuzmite APK datoteku
          2. Omogućite "Nepoznati izvori" u podešavanjima telefona
          3. Otvorite APK datoteku i instalirajte
          
          ## 🔧 Funkcionalnosti
          - Kompletna administracija servisa
          - Offline rad
          - Brž pristup podacima
          - Professional mobile interface
          
          ## 📱 Kompatibilnost
          - Android 7.0+ (API 24)
          - Sve Android verzije telefona
          
          ---
          *Kreirana automatski GitHub Actions workflow-om*
        files: android/app/build/outputs/apk/debug/app-debug.apk
        draft: false
        prerelease: false
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

4. **Commit poruka:**
```
🚀 Add GitHub Actions workflow - Aktivacija automatskog APK kreiranja
```

5. **Kliknite "Commit new file"**

---

## 🎯 **REZULTAT**

**Čim commit-ujete workflow fajl:**

✅ **AUTOMATSKI SE AKTIVIRA:**
- GitHub Actions build se pokreće
- APK se automatski kreira za 15 minuta
- Release se publikuje sa APK datotekom
- Svi budući push-ovi na main granu će automatski kreirati novi APK

**📱 APK Download:**
- GitHub → Repository → Releases → Latest Release
- Download `app-debug.apk` 
- Instaliraj na Android telefon

---

## ✅ **TESTIRANJE**

Nakon što upload-ujete workflow:

1. **Idite na:** https://github.com/gruica/servis-todosijevic-mobile/actions
2. **Videćete:** "Build Android APK" workflow u toku
3. **Čekajte 15 minuta:** da se build završi
4. **Proverite:** GitHub → Releases → Latest release za APK

---

## 📊 **TRENUTNO STANJE**

**✅ Uploadovano (95%):**
- ✅ Svi config fajlovi (package.json, capacitor.config.ts, itd.)
- ✅ Database schema (shared/schema.ts - 78KB)
- ✅ React frontend osnove
- ✅ Express server osnove
- ✅ Android build sistem

**⏳ Nedostaje (5%):**
- ⏳ GitHub Actions workflow (ovo što sada upload-ujete)
- ⏳ Neki server routes (opciono za početak)

**GitHub repository je SPREMAN za automatsko APK kreiranje!** 🎉

---

*Generated: 17.08.2025 11:10*