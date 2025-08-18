# Vodič za Android APK Deployment preko GitHub Actions

## 🚀 Pregled opcija

Kreirao sam **3 GitHub Actions workflow-a** za kreiranje APK aplikacije:

### 1. **build-apk.yml** - Osnovni build
- Pokreće se na svaki push ili pull request
- Kreira debug APK verziju
- Čuva APK kao GitHub artifact (dostupan 30 dana)
- **Koristi se za**: razvoj i testiranje

### 2. **release-apk.yml** - Production release
- Pokreće se kada kreirate git tag (v1.0.0, v2.1.5, itd.)
- Kreira potpisanu release verziju APK-a
- Automatski kreira GitHub Release sa opisom
- **Koristi se za**: oficijelne verzije za krajnje korisnike

### 3. **test-apk.yml** - Testiranje
- Pokreće se na pull request-e
- Testira da li se APK može kreirati
- **Koristi se za**: validaciju pre merge-a

## 📱 Kako pokrenuti kreiranje APK-a

### Opcija A: Automatski (preporučeno)
1. Commit i push kod na main branch
2. GitHub Actions će automatski kreirati APK
3. Idite na GitHub → Actions tab da vidite progress
4. Kada se završi, preuzmite APK iz Artifacts sekcije

### Opcija B: Manuelno
1. Idite na GitHub → Actions tab
2. Kliknite na "Build Android APK" workflow
3. Kliknite "Run workflow" dugme
4. Preuzmite APK kada se završi

### Opcija C: Release verzija
1. Kreirajte git tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
2. GitHub Actions će kreirati potpisanu verziju
3. APK će biti dostupan u GitHub Releases

## 🔐 Setup za potpisivanje APK-a (opciono ali preporučeno)

Za produkciju treba kreirati keystore za potpisivanje APK-a:

### Korak 1: Kreiranje keystore-a
```bash
keytool -genkey -v -keystore servis-todosijevic-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias servis-app
```

Popuniti:
- **Password**: bezbedni password (zapamtiti!)
- **Name**: Servis Todosijević
- **Organization**: Frigo Sistem Todosijević
- **City**: vaš grad
- **Country**: RS

### Korak 2: Dodavanje u GitHub Secrets
GitHub → Settings → Secrets and variables → Actions:

1. **KEYSTORE_FILE**: 
   ```bash
   base64 -i servis-todosijevic-keystore.jks
   ```
   (kopirajte ceo output)

2. **KEYSTORE_PASSWORD**: password za keystore
3. **KEY_ALIAS**: servis-app  
4. **KEY_PASSWORD**: password za ključ

## 📋 Šta je automatski konfigurisano

### Capacitor konfiguracija
- ✅ App ID: `com.servistodosijevic.app`
- ✅ App Name: `Servis Todosijević`
- ✅ Web dir: `dist/public`
- ✅ Android scheme: `https`
- ✅ Splash screen i status bar

### Android manifest
- ✅ Permissions za internet i network state
- ✅ Ikone i splash screen
- ✅ Target SDK i minimum SDK verzije

### Build process
- ✅ Node.js 20 setup
- ✅ Android SDK i Java 17 setup
- ✅ Automatski npm install i build
- ✅ Capacitor sync
- ✅ Gradle build sa debug/release opcijama

## 🔄 Workflow statusi

### Status indikatori u GitHub Actions:
- 🟢 **Success**: APK je uspešno kreiran
- 🟡 **In progress**: Build je u toku
- 🔴 **Failed**: Greška u build-u (proveriti logs)

### Česti problemi i rešenja:

**Problem**: Build fails na "Setup Android"
**Rešenje**: Povremeno se dogodi, samo ponovo pokreniti workflow

**Problem**: "Keystore not found"  
**Rešenje**: Dodati keystore secrets ili koristiti debug build

**Problem**: "Permission denied on gradlew"
**Rešenje**: Automatski se rešava sa `chmod +x gradlew`

## 📦 Gde pronaći APK

### Debug verzije:
1. GitHub → Actions → Build Android APK
2. Kliknuti na poslednji uspešan run
3. Scroll dole do "Artifacts"
4. Download "android-apk-[broj]"

### Release verzije:
1. GitHub → Releases
2. Kliknuti na najnoviju verziju
3. Download APK iz "Assets"

## 🚀 Prednosti ovog pristupa

### Za developere:
- ✅ Automatizovan process
- ✅ Verzionisanje APK-ova
- ✅ Testiranje na različitim Android verzijama
- ✅ Backup svih verzija na GitHub

### Za krajnje korisnike:
- ✅ Uvek najnovija verzija dostupna
- ✅ Potpisane verzije za bezbednost
- ✅ Changelog sa svakim release-om
- ✅ Direktan download sa GitHub-a

### Za biznis:
- ✅ Profesionalan deployment process
- ✅ Kontrola verzija i rollback opcije
- ✅ Automatska distribucija
- ✅ Sigurnost i compliance

## 🎯 Sledeci koraci

1. **Testirati osnovni build** - push neki kod i videti da li radi
2. **Setup keystore** - za produkciju verzije
3. **Kreirati prvi tag** - za prvi release
4. **Podesiti ikone** - zameniti default ikone sa brendiranim
5. **Testirati na uređaju** - instalirati APK i testirati funkcionalnost

---

**Napomena**: Svi workflow-ovi su optimizovani za vašu postojeću arhitekturu sa Capacitor-om i neće uticati na postojeći kod.