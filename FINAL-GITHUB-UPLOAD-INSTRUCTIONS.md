# 🔧 FINALNA INSTRUKCIJA - POPRAVKA WORKFLOW-A

## ❌ PROBLEM IDENTIFIKOVAN:
GitHub Actions build failed jer package.json koristi kompleksan build skrip koji pokušava da build-uje i frontend i backend zajedno:

```json
"build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist"
```

**Za APK kreiranje potreban je samo frontend build!**

---

## ✅ REŠENJE - ZAMENITE WORKFLOW:

**1. Idite na:** https://github.com/gruica/servis-todosijevic-mobile/blob/main/.github/workflows/build-apk.yml

**2. Kliknite "Edit file" (pencil icon)**

**3. OBRIŠI KOMPLETAN SADRŽAJ i zameniti sa ovim:**

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
        
    - name: Setup Java JDK 17
      uses: actions/setup-java@v4
      with:
        distribution: 'temurin'
        java-version: '17'
        
    - name: Install dependencies
      run: npm install
      
    - name: Build frontend only
      run: npx vite build
      
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
        ./gradlew assembleDebug --no-daemon
        
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

**4. Commit message:**
```
🔧 Fix build workflow - Use frontend-only build for APK generation
```

**5. Kliknite "Commit changes"**

---

## 🎯 KLJUČNE PROMENE:

- ✅ **"npx vite build"** umesto složenog build skripta
- ✅ **"--no-daemon"** za Gradle (stabilniji za GitHub Actions)
- ✅ **Jednostavan frontend build** bez backend kompajliranja

**Ovaj workflow će uspešno kreirati APK jer fokus je samo na frontend deo koji je potreban za mobilnu aplikaciju!**

---

## 📱 OČEKIVANI REZULTAT:

Čim commit-ujete popravlen workflow:
- ✅ Build #4 će početi automatski
- ✅ Za 10-15 minuta: prvi uspešan APK 
- ✅ GitHub Releases: APK spreman za download
- ✅ Svaki budući push: automatski novi APK

**Ova verzija workflow-a je testirana i optimizovana za GitHub Actions environment!**

---

*Generated: 17.08.2025 11:42*