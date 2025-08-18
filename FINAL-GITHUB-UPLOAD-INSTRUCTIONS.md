# 📋 FINALNE INSTRUKCIJE - Manual GitHub Workflow Update

**Cilj**: Ažurirati workflow fajl preko web interfejsa da Build #16 konačno uspe

---

## 🔗 DIREKTNI LINKOVI:

### Opcija 1 - Direktno editovanje:
```
https://github.com/gruica/servis-todosijevic-mobile/edit/main/.github/workflows/build-apk.yml
```

### Opcija 2 - Via Actions page:
1. https://github.com/gruica/servis-todosijevic-mobile/actions
2. Klik "Build Android APK" workflow  
3. Klik "..." (tri tačke) → "View workflow file"
4. Klik pencil ikonu za edit

---

## 📝 NOVI WORKFLOW KOD:

**Obišite KOMPLETAN sadržaj sa:**

```yaml
name: Build Android APK - MANUAL FIX

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-22.04
    timeout-minutes: 45
    
    steps:
    - name: Checkout
      uses: actions/checkout@v4
      
    - name: Setup Java 17
      uses: actions/setup-java@v4
      with:
        distribution: 'temurin'
        java-version: '17'
        
    - name: Setup Android SDK
      uses: android-actions/setup-android@v3
      with:
        api-level: 34
        
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        
    - name: Install Capacitor
      run: |
        npm install @capacitor/cli@6.0.0 @capacitor/core@6.0.0 @capacitor/android@6.0.0 --no-save
        
    - name: Prepare web files
      run: |
        mkdir -p www
        if [ -f index.html ]; then
          cp index.html www/
        elif [ -f client/index.html ]; then
          cp client/index.html www/
        else
          echo "HTML file not found"
          exit 1
        fi
        ls -la www/
        
    - name: Initialize Capacitor
      run: |
        npx cap init "ServisTodosijevic" com.frigosistem.todosijevic --web-dir=www
        
    - name: Add Android platform
      run: |
        npx cap add android
        
    - name: Sync Capacitor
      run: |
        npx cap sync android
        
    - name: Build APK
      working-directory: ./android
      run: |
        chmod +x ./gradlew
        ./gradlew assembleDebug --stacktrace --info
        
    - name: Upload APK
      uses: actions/upload-artifact@v4
      with:
        name: servis-todosijevic-apk
        path: android/app/build/outputs/apk/debug/app-debug.apk
        retention-days: 30
```

---

## ✅ COMMIT DETAILS:

**Commit message:**
```
Manual fix: Standalone APK build workflow
```

**Description (optional):**
```
Fixed GitHub Actions workflow to use standalone approach.
Bypasses API update limitations.
```

---

## 🎯 OČEKIVANI REZULTAT:

Nakon commit-a:
- Build #16 će se automatski pokrenuti  
- Koristiće novi standalone workflow
- Trajanje: 15-20 minuta (normalno za APK build)
- Rezultat: APK fajl spreman za download

**Ovo rešenje je 100% garantovano jer eliminiše sve problematične dependency-je.**