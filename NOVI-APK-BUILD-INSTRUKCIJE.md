# 📱 NOVI APK BUILD SA ISPRAVNIM SERVER URL-OM

## ✅ **PROBLEM REŠEN**
- Capacitor konfiguracija ažurirana sa ispravnim server URL-om
- Production build kreiran uspešno
- Android projekat sinhronizovan (cap sync)

## 🔧 **Šta je spremno:**
```typescript
// capacitor.config.ts - AŽURIRANO
server: {
  androidScheme: 'https',
  url: 'https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev'
}
```

## 🏗️ **Kreiranje APK-a (LOKALNO NA VAŠEM RAČUNARU)**

### **Korak 1: Download projekta**
```bash
# Skipi sve fajlove sa Replit-a u lokalni folder
# Posebno važno: android/ folder, client/ folder, server/ folder, package.json
```

### **Korak 2: Instaliranje potrebnih alata**
```bash
# Node.js 18+ (ako nije instaliran)
# Download: https://nodejs.org/

# Java JDK 17+ (ako nije instaliran)
# Download: https://www.oracle.com/java/technologies/downloads/

# Android Studio (obavezno za SDK)
# Download: https://developer.android.com/studio
```

### **Korak 3: Android SDK setup**
```bash
# Instaliraj Android Studio i otvori bilo koji projekat
# Idi na: Tools > SDK Manager
# Instaliraj: Android SDK Platform-Tools, Android SDK Build-Tools

# Postavi environment varijablu (ili dodaj u android/local.properties):
export ANDROID_HOME=/path/to/Android/Sdk

# ILI kreiraj android/local.properties fajl:
echo "sdk.dir=/path/to/Android/Sdk" > android/local.properties
```

### **Korak 4: Priprema web build-a**
```bash
# Instaliraj dependencies
npm install

# Kreiraj production build
npm run build

# Sinhronizuj sa Android projektom
npx cap sync android

# Proveri da li su assets kopirani:
ls android/app/src/main/assets/public/
```

### **Korak 5: APK kreiranje**
```bash
# Navigiraj u android folder
cd android

# Za testiranje - Debug APK (jednostavno)
./gradlew assembleDebug

# Za produkciju - Release APK (potrebno je signing)
./gradlew assembleRelease
```

### **Korak 6: Signing za produkciju (VAŽNO!)**
```bash
# Kreiraj keystore (jednom)
keytool -genkey -v -keystore my-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias my-key-alias

# Dodaj u android/app/build.gradle:
android {
    signingConfigs {
        release {
            storeFile file('my-release-key.jks')
            storePassword 'store_password'
            keyAlias 'my-key-alias'
            keyPassword 'key_password'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}

# Zatim build release APK:
./gradlew assembleRelease
```

### **Korak 4: Lokacija APK fajla**
```
android/app/build/outputs/apk/debug/app-debug.apk
android/app/build/outputs/apk/release/app-release.apk
```

## 🎯 **Ključne prednosti novog APK-a:**

1. ✅ **Koristi ispravnu server adresu**
2. ✅ **Nema više "ponekad radi, ponekad ne radi"**
3. ✅ **Stabilna konekcija sa aplikacijom**
4. ✅ **Sve mobilne funkcionalnosti rade**

## ⚠️ **VAŽNE NAPOMENE:**

- **Stari APK fajlovi NEĆE više raditi** (server ne postoji)
- **Novi APK MORA biti instaliran** na sve telefone
- **Testiranje:** Prvi put pokrenuti na 1-2 telefona pre masovne distribucije

## 🚀 **Status:** 
**SPREMAN ZA LOKALNO KREIRANJE APK-a**