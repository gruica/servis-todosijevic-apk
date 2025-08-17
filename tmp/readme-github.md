# 📱 Servis Todosijević - Mobile APK Distribution

> **Profesionalna mobilna aplikacija za upravljanje servisom belih dobara - automatsko kreiranje Android APK-ja kroz GitHub Actions**

## 🏢 O Aplikaciji

**Servis Todosijević** je napredna platforma za upravljanje servisom belih dobara (frižideri, veš mašine, sudijeri, špuretovi) sa kompletnom digitalizacijom procesa. Aplikacija omogućava:

- 👥 **Klijentski portal** - praćenje statusa servisa
- 🔧 **Serviseri panel** - mobilna aplikacija za tehnčare
- 🏢 **Admin panel** - kompletno upravljanje
- 📧 **Email/SMS notifikacije** - automatsko obaveštavanje
- 📊 **Izveštaji i analitika** - business intelligence

## 🚀 Automatsko APK Kreiranje

Ova GitHub repository omogućava **automatsko kreiranje Android APK-a** svaki put kada se kod ažurira.

### ⚙️ GitHub Actions Workflow

Da bi se aktivirao automatski build:

1. **Dodajte GitHub Actions workflow**:
   ```
   mkdir -p .github/workflows
   ```
   
2. **Kreirajte datoteku** `.github/workflows/build-apk.yml` sa sadržajem:

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

## 📦 Build Proces

### Automatski Build
- **Trigger**: Svaki push na `main` granu
- **Trajanje**: 10-15 minuta
- **Rezultat**: APK datoteka dostupna za download

### Manual Build
```bash
# Lokalni build (opcional)
npm install
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

## 📱 APK Download

Posle uspešnog build-a, APK možete preuzeti na 2 načina:

### 1. GitHub Releases (Preporučeno)
- Idite na **Releases** tab
- Download najnoviju verziju APK-a
- Automatski kreiran release sa verzijom

### 2. Actions Artifacts
- Idite na **Actions** tab  
- Kliknite na poslednji uspešan build
- Download APK iz **Artifacts** sekcije

## 🔧 Tehničke Specifikacije

### Frontend
- **Framework**: React.js + TypeScript
- **UI Library**: Shadcn/UI + Tailwind CSS
- **Build Tool**: Vite
- **Mobile**: Capacitor

### Backend  
- **Runtime**: Node.js + Express
- **Database**: PostgreSQL + Drizzle ORM
- **Authentication**: JWT

### Mobile
- **Platform**: Android 7.0+ (API 24)
- **Size**: ~25-30 MB
- **Permissions**: Internet, Storage, Camera (za OCR)

## 📋 Potrebni Fajlovi

Ova repository sadrži osnovnu konfiguraciju. Za kompletan build, potrebno je dodati:

### Obavezno
- `client/` folder - React frontend
- `server/` folder - Express backend  
- `android/` kompletnu strukturu
- `.github/workflows/build-apk.yml` - GitHub Actions

### Opciono
- `docs/` - dokumentacija
- `.env.example` - environment varijable
- `scripts/` - helper skriptovi

## 🚀 Deployment Guide

1. **Upload kompletnu source kod**
2. **Dodaj GitHub Actions workflow** (gore)
3. **Push na main granu**
4. **Čekaj 15 minuta** - APK spreman!

## 📞 Podrška

Za tehničku podršku kontaktirajte:
- **Email**: servis@frigosistemtodosijevic.com
- **Web**: https://frigosistemtodosijevic.com

---

## 📜 Licenca

Ova aplikacija je vlasništvo **Frigo Sistem Todosijević** i namijenjena je isključivo za interne potrebe kompanije.

© 2025 Frigo Sistem Todosijević. Sva prava zadržana.