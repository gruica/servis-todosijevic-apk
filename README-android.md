# Uputstvo za kreiranje Android aplikacije

## Preduslov
Za kreiranje Android aplikacije potrebno je da instalirate sledeće komponente na vašem računaru:

1. Java JDK 17 ili noviji
2. Android Studio 
3. Node.js i npm
4. Capacitor CLI (`npm install -g @capacitor/cli`)

## Koraci za kreiranje APK fajla

### 1. Kloniranje repozitorijuma
```
git clone <url-repozitorijuma>
cd <direktorijum-projekta>
```

### 2. Instalacija zavisnosti
```
npm install
```

### 3. Kreiranje produkcijske verzije web aplikacije
```
npm run build
```

### 4. Sinhronizacija Android projekta
```
npx cap sync
```

### 5. Otvaranje projekta u Android Studio-u
```
npx cap open android
```

### 6. Kreiranje APK fajla u Android Studio-u
1. U Android Studio-u izaberite meni: Build > Build Bundle(s) / APK(s) > Build APK(s)
2. Sačekajte da se proces kompilacije završi
3. Kliknite na notifikaciju "APK generated successfully" i izaberite "locate" da pronađete APK fajl
4. Kopirajte APK fajl na željenu lokaciju

Alternativno, APK možete kreirati korišćenjem komandne linije:
```
cd android
./gradlew assembleDebug
```

Debug APK će biti dostupan na putanji: `android/app/build/outputs/apk/debug/app-debug.apk`

## Distribucija APK fajla

Kreirani APK fajl možete distribuirati:
1. Deljenjem direktno putem email-a
2. Postavljanjem na web sajt za preuzimanje
3. Korišćenjem servisa za distribuciju aplikacija kao što je Firebase App Distribution

**Napomena:** Za produkcijsko objavljivanje na Google Play Store-u potrebno je kreirati potpisani APK ili App Bundle, što je opisano u Android Studio dokumentaciji.

## Izmene u projektu

Ukoliko napravite izmene u web aplikaciji, potrebno je ponoviti korake:
1. `npm run build`
2. `npx cap sync`
3. Ponovna kompilacija u Android Studio-u

## Zahtevi za Android uređaje

Aplikacija podržava Android 7.0 (API nivo 24) i novije verzije Android operativnog sistema.