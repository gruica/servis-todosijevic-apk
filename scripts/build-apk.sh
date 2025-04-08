#!/bin/bash

echo "Kompilacija web aplikacije..."
npm run build || { echo "Greška pri kompilaciji web aplikacije"; exit 1; }

echo "Ažuriranje Android projekta..."
npx cap sync || { echo "Greška pri sinhronizaciji Android projekta"; exit 1; }

# Provera da li je Android Studio instaliran i podešen
if [ -z "$ANDROID_HOME" ]; then
  echo "ANDROID_HOME nije postavljen. Molimo podesite putanju do Android SDK-a."
  exit 1
fi

echo "Čišćenje prethodnog builda..."
cd android
./gradlew clean || { echo "Greška pri čišćenju Android projekta"; exit 1; }

echo "Kreiranje debug APK-a..."
./gradlew assembleDebug || { echo "Greška pri kreiranju debug APK-a"; exit 1; }

echo "Kreiranje release APK-a..."
./gradlew assembleRelease || { echo "Greška pri kreiranju release APK-a"; exit 1; }

# Provera da li su APK fajlovi kreirani
DEBUG_APK="app/build/outputs/apk/debug/app-debug.apk"
RELEASE_APK="app/build/outputs/apk/release/app-release-unsigned.apk"

if [ -f "$DEBUG_APK" ]; then
  echo "Debug APK kreiran: $DEBUG_APK"
  # Kopiranje u roditeljski folder za lakši pristup
  cp "$DEBUG_APK" "../servistodosijevic-debug.apk"
  echo "Kopirano u: ../servistodosijevic-debug.apk"
else
  echo "Debug APK nije pronađen."
fi

if [ -f "$RELEASE_APK" ]; then
  echo "Release APK kreiran: $RELEASE_APK"
  # Kopiranje u roditeljski folder za lakši pristup
  cp "$RELEASE_APK" "../servistodosijevic-release-unsigned.apk"
  echo "Kopirano u: ../servistodosijevic-release-unsigned.apk"
  
  echo "NAPOMENA: Release APK nije potpisan. Za produkciju koristite:"
  echo "./gradlew assembleRelease && jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore putanja/do/keystore.jks app/build/outputs/apk/release/app-release-unsigned.apk alias_key"
else
  echo "Release APK nije pronađen."
fi

cd ..
echo "Proces kompilacije završen."
