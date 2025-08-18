# 🚨 URGENT: MANUAL GITHUB WORKFLOW FIX

**Problem**: GitHub Actions koristi stari workflow fajl umesto novog!
**Rešenje**: Manuelno ažurirati workflow fajl na GitHub-u

---

## 📋 MANUAL STEPS:

### 1. Idite na GitHub repository:
```
https://github.com/gruica/servis-todosijevic-mobile/.github/workflows/build-apk.yml
```

### 2. Kliknite "Edit file" (olovka ikona)

### 3. Obišite CELI sadržaj sa ovim:

```yaml
name: Build Android APK - STANDALONE

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build-standalone:
    runs-on: ubuntu-22.04
    timeout-minutes: 30
    
    steps:
    - name: 📥 Checkout repository
      uses: actions/checkout@v4
      
    - name: 📋 List repository contents
      run: |
        echo "=== REPOSITORY STRUCTURE ==="
        find . -type f -name "*.html" -o -name "*.json" -o -name "*.yml" | head -20
        
    - name: ☕ Setup Java 17
      uses: actions/setup-java@v4
      with:
        distribution: 'temurin'
        java-version: '17'
        
    - name: 📱 Setup Android SDK
      uses: android-actions/setup-android@v3
      with:
        api-level: 34
        
    - name: 🔧 Setup Node.js (minimal)
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        
    - name: 📦 Install only Capacitor
      run: |
        echo "Installing only Capacitor dependencies..."
        npm install @capacitor/cli@6.0.0 @capacitor/core@6.0.0 @capacitor/android@6.0.0 --no-save
        
    - name: 🏗️ Prepare web directory
      run: |
        mkdir -p www
        cp index.html www/index.html || echo "index.html not found, using client/index.html"
        cp client/index.html www/index.html || echo "No HTML file found"
        ls -la www/
        
    - name: ⚡ Initialize Capacitor
      run: |
        npx cap init "ServisTodosijevic" com.frigosistem.todosijevic --web-dir=www
        
    - name: 📱 Add Android platform
      run: |
        npx cap add android
        
    - name: 🔄 Sync Capacitor
      run: |
        npx cap sync android
        
    - name: 🏗️ Build APK with debugging
      working-directory: ./android
      run: |
        chmod +x ./gradlew
        echo "Starting Android build..."
        ./gradlew assembleDebug --stacktrace --info
        
    - name: ✅ Verify APK creation
      run: |
        echo "=== APK BUILD VERIFICATION ==="
        find android/app/build/outputs/apk -name "*.apk" -ls
        
    - name: 📤 Upload APK
      uses: actions/upload-artifact@v4
      with:
        name: servis-todosijevic-standalone-apk
        path: android/app/build/outputs/apk/debug/app-debug.apk
        retention-days: 30
        
    - name: 🎉 Success notification
      run: |
        echo "🎉 APK SUCCESSFULLY CREATED! 🎉"
        echo "Download from Artifacts section above."
```

### 4. Kliknite "Commit changes"

### 5. Upišite commit message:
```
🔥 ULTIMATE: Manual workflow fix - standalone APK build
```

### 6. Kliknite "Commit changes" opet

---

## 🎯 Rezultat:
Build #16 će koristiti novi workflow i trebalo bi da uspe!

*Manual fix needed zbog GitHub API cache problema*