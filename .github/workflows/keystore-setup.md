# Kreiranje Android Keystore za potpisivanje APK-a

## Korak 1: Kreiranje keystore datoteke

```bash
keytool -genkey -v -keystore servis-todosijevic-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias servis-app
```

Popuniti informacije:
- Password: [vaš bezbedni password]
- First and last name: Servis Todosijević
- Organization: Frigo Sistem Todosijević  
- City: [vaš grad]
- State: Serbia
- Country code: RS

## Korak 2: Dodavanje secrets u GitHub

U GitHub repository → Settings → Secrets and variables → Actions, dodati:

1. `KEYSTORE_FILE` - Base64 enkodovana keystore datoteka:
   ```bash
   base64 -i servis-todosijevic-keystore.jks | pbcopy
   ```

2. `KEYSTORE_PASSWORD` - Password za keystore

3. `KEY_ALIAS` - servis-app

4. `KEY_PASSWORD` - Password za ključ

## Korak 3: Konfiguracija gradle-a za potpisivanje

Dodati u `android/app/build.gradle`:

```gradle
android {
    signingConfigs {
        release {
            storeFile file('../../keystore.jks')
            storePassword System.getenv('KEYSTORE_PASSWORD')
            keyAlias System.getenv('KEY_ALIAS')
            keyPassword System.getenv('KEY_PASSWORD')
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```