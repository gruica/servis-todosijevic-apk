#!/bin/bash

echo "Priprema projekta za Android pakovanje..."

# Kreiranje produkcijske verzije web aplikacije
echo "Kreiranje produkcijske verzije web aplikacije..."
npm run build || { echo "Greška pri kompilaciji web aplikacije"; exit 1; }

# Sinhronizacija sa Android projektom
echo "Ažuriranje Android projekta..."
npx cap sync || { echo "Greška pri sinhronizaciji Android projekta"; exit 1; }

echo "Projekat je uspešno pripremljen za Android pakovanje!"
echo "Da biste kreirali APK fajl, kopirajte 'android' folder na računar sa Android Studio-om."
echo "Zatim u Android Studio-u otvorite folder 'android' i kreiranje APK fajla izvršite kroz meni:"
echo "Build > Build Bundle(s) / APK(s) > Build APK(s)"