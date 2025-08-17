# 📱 Servis Todosijević - Mobilna Aplikacija

Kompletna platforma za upravljanje servisom bele tehnike sa automatskim APK build sistemom.

## 🚀 Funkcionalnosti

- **Multi-role sistem**: Admin, Serviser, Klijent, Poslovni partner
- **Offline rad**: Kompletno funkcionalna bez interneta
- **Automatsko APK kreiranje**: GitHub Actions workflow
- **SMS & Email notifikacije**: Automatske obavesti za sve servise
- **OCR skeniranje**: Prepoznavanje podataka sa slika
- **Inventory tracking**: Praćenje rezervnih delova

## 📱 Android APK

APK fajlovi se automatski kreiraju kroz GitHub Actions na svaki push.

### Download Latest APK
- [Releases stranica](https://github.com/gruica/servis-todosijevic-mobile/releases)
- Minimum Android: 7.0 (API 24)
- Target Android: 14 (API 34)

### Instalacija
1. Download APK sa releases stranice
2. Podešavanja → Sigurnost → Dozvoli nepoznate aplikacije
3. Instaliraj APK fajl
4. Login sa postojećim podacima

## 🛠️ Development Setup

```bash
# Instalacija dependencies
npm install

# Development server
npm run dev

# Build za produkciju
npm run build

# Android build
npm run android:build
```

## 🏗️ Tehnologije

- **Frontend**: React.js + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express.js + PostgreSQL
- **Mobile**: Capacitor za Android APK
- **Database**: Drizzle ORM
- **Auth**: JWT sa 30-day expiration

## 📊 Struktura Projekta

```
├── client/          # React frontend
├── server/          # Express backend
├── shared/          # Shared types & schemas
├── android/         # Capacitor Android project
└── .github/         # GitHub Actions workflows
```

## 🔒 Environment Variables

```env
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret
EMAIL_PASSWORD=email-password
SMS_API_KEY=sms-api-key
```

## 📧 Kontakt

**Email**: gruica@frigosistemtodosijevic.com  
**Company**: Frigo Sistem Todosijević d.o.o.  
**Location**: Serbia

---

*Automatski generisan APK build sistem uz GitHub Actions*