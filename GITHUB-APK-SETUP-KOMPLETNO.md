# 🚀 GITHUB APK KREIRANJE - KOMPLETNE INSTRUKCIJE

## 📋 ŠTA TREBATE DA URADITE (5 koraka)

### 1️⃣ KREIRANJE GITHUB ACCOUNT-a
1. Idite na: **https://github.com**
2. Kliknite **"Sign up"** (ili "Registracija")
3. Unesite:
   - **Username**: npr. `todosijevic-servis`
   - **Email**: vaš email
   - **Password**: siguran password
4. Završite registraciju

---

### 2️⃣ KREIRANJE NOVOG REPOSITORY-a
1. Nakon prijave, kliknite **"New repository"** (zeleno dugme)
2. Unesite:
   - **Repository name**: `servis-todosijevic-apk`
   - **Description**: `Servis Todosijević Mobile Application`
   - **Public** ✅ (da bude besplatno)
   - **Add README file** ✅
3. Kliknite **"Create repository"**

---

### 3️⃣ UPLOAD VAŠIH DATOTEKA
Kada kreirate repository, imaćete 2 opcije:

#### OPCIJA A: Upload ZIP (Najjednostavnije)
1. **Download-ujte projekat sa Replit-a** kao ZIP
2. **Raspakujte ZIP** na svojem računaru
3. **U GitHub repository-u kliknite "uploading an existing file"**
4. **Povucite sve fajlove** iz raspakovane mape
5. **Dodajte commit message**: "Initial APK project upload"
6. **Kliknite "Commit changes"**

#### OPCIJA B: Git Clone (Napredniji)
```bash
# Na svojem računaru:
git clone https://github.com/VASE-KORISNICKO-IME/servis-todosijevic-apk.git
# Kopirajte fajlove iz Replit-a u ovaj folder
git add .
git commit -m "Initial APK project upload"
git push origin main
```

---

### 4️⃣ AKTIVIRANJE GITHUB ACTIONS
1. **U vašem GitHub repository**, kliknite tab **"Actions"**
2. **GitHub će automatski detektovati** workflow fajl (`.github/workflows/build-apk.yml`)
3. **Kliknite "I understand my workflows"** da omogućite Actions
4. **GitHub Actions su sada aktivni!**

---

### 5️⃣ POKRETANJE APK BUILD-a
Nakon upload-a fajlova, APK se automatski kreira kada:

#### Automatsko pokretanje:
- **Svaki put kada postavite novi kod**
- **Svaki put kada uredite bilo koji fajl**

#### Ručno pokretanje:
1. **Idite na "Actions" tab**
2. **Kliknite "Build Android APK"**
3. **Kliknite "Run workflow"**
4. **Kliknite "Run workflow" ponovo**

---

## 📥 KAKO DA PREUZMETE APK

### Dok se build izvršava:
1. **Idite na "Actions" tab**
2. **Kliknite na poslednji "Build Android APK" job**
3. **Pratite status** (žuti = u toku, zelen = završeno, crven = greška)

### Kada se build završi:
1. **Scroll-ujte na dno** stranice job-a
2. **Videćete "Artifacts" sekciju**
3. **Kliknite "servis-todosijevic-debug-apk"**
4. **ZIP fajl će se download-ovati sa APK datotekom**

### Alternativno - Releases:
1. **Idite na "Releases" tab** u repository-u
2. **Najnoviji release** će imati APK datoteku
3. **Kliknite na APK** da ga download-ujete

---

## 📱 INSTALIRANJE APK-a NA TELEFON

### Android telefon:
1. **Omogućite "Unknown Sources"** u podešavanjima
   - Settings → Security → Unknown Sources ✅
2. **Transfer-ujte APK** na telefon (email, USB, cloud)
3. **Otvorite APK datoteku** sa File Manager-om
4. **Kliknite "Install"**
5. **Aplikacija je instalirana!** 🎉

---

## 🔧 TEHNIČKI DETALJI

### Šta GitHub Actions radi:
1. **Setup-uje Node.js** (verzija 20)
2. **Setup-uje Java JDK 17**
3. **Setup-uje Android SDK**
4. **Instalira dependencies** (`npm ci`)
5. **Build-uje web aplikaciju** (`npm run build`)
6. **Sync-uje Capacitor** (`npx cap sync android`)
7. **Build-uje APK** pomoću Gradle
8. **Upload-uje APK** kao artifact
9. **Kreira release** sa APK datotekom

### APK specifikacije:
- **Bundle ID**: `me.tehnikamne.frigosistem`
- **Version**: `v1.0.X` (automatski incrementing)
- **Target**: Android 7.0+ (API 24)
- **Features**: Camera, Network, StatusBar, SplashScreen
- **Size**: ~15-25MB

---

## ❓ MOGUĆI PROBLEMI I REŠENJA

### Problem: "Build failed"
**Rešenje**: 
1. Proverite da li su svi fajlovi upload-ovani
2. Proverite "Actions" tab za detaljnu grešku
3. Kontaktirajte me sa screenshot-om greške

### Problem: "APK se ne instalira"
**Rešenje**:
1. Omogućite "Unknown Sources" u podešavanjima
2. Proverite da li imate dovoljno prostora (30MB+)
3. Restartujte telefon i pokušajte ponovo

### Problem: "Ne mogu da nađem APK"
**Rešenje**:
1. Idite na "Actions" → najnoviji job → "Artifacts" sekcija
2. Ili idite na "Releases" tab u repository-u
3. Download-ujte ZIP, raspakujte, unutra je APK

---

## 🎯 REZIME - ŠTA TREBA DA URADITE

1. **Kreirajte GitHub account** (besplatno)
2. **Kreirajte novi repository** (`servis-todosijevic-apk`)
3. **Upload-ujte fajlove** sa Replit-a
4. **Aktivirajte GitHub Actions**
5. **Download-ujte APK** kada se build završi
6. **Instalirajte na telefon**

**VREMENSKA PROCJENA:**
- Setup: 10 minuta
- Upload: 5 minuta  
- Build: 10-15 minuta
- **UKUPNO: ~30 minuta do готове APK aplikacije!**

---

**🚀 SLEDEĆI KORAK: KLIKNITE DA KREIRATE GITHUB ACCOUNT!**

**Link: https://github.com**