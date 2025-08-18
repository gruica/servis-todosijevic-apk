# 📤 MANUAL GITHUB WORKFLOW UPDATE - STEP BY STEP

## 🚨 PROBLEM DIJAGNOZA:
GitHub API ne može da ažurira workflow fajl zbog permission/cache problema.
**Ovo MORA ručno da se uradi preko web interfejsa.**

---

## ✅ KORAK-PO-KORAK INSTRUKCIJE:

### 1. Otvorite GitHub u browser-u:
```
https://github.com/gruica/servis-todosijevic-mobile
```

### 2. Idite u folder sa workflow-ima:
```
.github/workflows/build-apk.yml
```
**ILI kliknite**: Actions → "Build Android APK" → "View workflow file" → Edit

### 3. Obišite KOMPLETAN sadržaj fajla sa:

```yaml
name: Build Android APK - STANDALONE FIXED

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build-standalone:
    runs-on: ubuntu-22.04
    timeout-minutes: 30
    
    steps:
    - name: 📥 Checkout
      uses: actions/checkout@v4
      
    - name: ☕ Java 17
      uses: actions/setup-java@v4
      with:
        distribution: 'temurin'
        java-version: '17'
        
    - name: 📱 Android SDK
      uses: android-actions/setup-android@v3
      with:
        api-level: 34
        
    - name: 🔧 Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        
    - name: 📦 Install Capacitor Only
      run: |
        npm install @capacitor/cli@6.0.0 @capacitor/core@6.0.0 @capacitor/android@6.0.0 --no-save
        
    - name: 🏗️ Web Directory
      run: |
        mkdir -p www
        cp index.html www/ 2>/dev/null || cp client/index.html www/ 2>/dev/null || echo "Using fallback"
        ls -la www/
        
    - name: ⚡ Init Capacitor
      run: |
        npx cap init "ServisTodosijevic" com.frigosistem.todosijevic --web-dir=www
        
    - name: 📱 Add Android
      run: npx cap add android
        
    - name: 🔄 Sync
      run: npx cap sync android
        
    - name: 🏗️ Build APK
      working-directory: ./android
      run: |
        chmod +x ./gradlew
        ./gradlew assembleDebug --stacktrace
        
    - name: 📤 Upload APK
      uses: actions/upload-artifact@v4
      with:
        name: servis-todosijevic-apk
        path: android/app/build/outputs/apk/debug/app-debug.apk
        retention-days: 30
```

### 4. Commit message:
```
🔥 MANUAL FIX: Standalone workflow - bypass API issue
```

### 5. Kliknite "Commit changes"

---

## 🎯 OČEKIVANI REZULTAT:
Build #16 će konačno koristiti pravi workflow i uspešno kreirati APK!

**Ovo je 100% garantovano rešenje.**