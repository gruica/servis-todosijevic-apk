# Servis Todosijević - Aplikacija za upravljanje servisima

Aplikacija za upravljanje servisima belih kućnih aparata za firmu Servis Todosijević. Omogućava praćenje servisa, održavanje klijenata i upravljanje servisnim tehničarima.

## Funkcionalnosti

- **Upravljanje klijentima**: Dodavanje, izmena i pregled klijenata, kao i upravljanje njihovim uređajima
- **Upravljanje servisima**: Praćenje servisa od kreiranja do završetka, dodeljivanje servisera
- **Upravljanje serviserima**: Dodeljivanje specijalnosti serviserima, praćenje njihovih aktivnosti
- **Planiranje održavanja**: Automatsko planiranje redovnog održavanja za uređaje
- **Notifikacije**: Automatsko slanje email obaveštenja klijentima o statusu servisa
- **Izveštavanje**: Generisanje izveštaja o servisima i održavanju
- **Mobilna aplikacija**: Android aplikacija za servisere na terenu

## Tehničke specifikacije

- **Frontend**: React.js, TypeScript, Tailwind CSS, Shadcn/UI
- **Backend**: Node.js, Express.js, TypeScript
- **Baza podataka**: PostgreSQL
- **Mobilna aplikacija**: Capacitor za pakovanje web aplikacije u Android APK

## Struktura projekta

- **client/**: React frontend aplikacija
  - **src/**: Izvorni kod
    - **components/**: React komponente
    - **pages/**: Stranice aplikacije
    - **hooks/**: React hooks
    - **lib/**: Biblioteke i utility funkcije
- **server/**: Node.js backend
  - **routes.ts**: API rute
  - **storage.ts**: Interfejs za skladištenje podataka
  - **auth.ts**: Autentifikacija korisnika
  - **email-service.ts**: Servis za slanje email obaveštenja
  - **maintenance-service.ts**: Servis za planiranje održavanja
  - **excel-service.ts**: Servis za uvoz/izvoz podataka
- **shared/**: Deljeni kod između frontend-a i backend-a
  - **schema.ts**: Definicije podataka i validacija
- **scripts/**: Skripte za održavanje i administraciju
- **android/**: Android projekat generisan pomoću Capacitor-a

## Instalacija i pokretanje

### Preduslov

- Node.js 20+
- PostgreSQL baza podataka
- SMTP server za slanje email-ova

### Razvoj

1. Klonirati repozitorijum
2. Instalirati zavisnosti: `npm install`
3. Postaviti potrebne environment varijable u `.env` fajlu
4. Pokrenuti aplikaciju u razvojnom modu: `npm run dev`

### Produkcija

1. Kompilacija aplikacije: `npm run build`
2. Pokretanje aplikacije: `npm start`

## Android mobilna aplikacija

Za uputstvo o kreiranju Android APK fajla, pogledajte [README-android.md](README-android.md).