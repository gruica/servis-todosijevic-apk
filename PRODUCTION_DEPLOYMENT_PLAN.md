# Plan za produkciju aplikacije Frigo Sistem Todosijević

## Trenutno stanje
- ✅ Aplikacija potpuno funkcionalna u Replit okruženju
- ✅ Sve bezbednosne mjere implementirane (SSL/TLS, security headers)
- ✅ Email i SMS notifikacije konfigurisane
- ✅ Database i svi API endpoints rade
- ⚠️ Domen www.frigosistemtodosijevic.me nije dostupan preko javnih DNS servera

## Opcije za produkciju

### 1. Replit Deployment (Preporučeno)
**Koraci:**
1. Kliknite na "Deploy" dugme u Replit konzoli
2. Odaberite "Autoscale" deployment
3. Replit će automatski:
   - Kreirati production URL (npr. `your-app.replit.app`)
   - Konfigurirati SSL certificat
   - Postaviti optimizovane server postavke

**Prednosti:**
- Jednostavno i brzo
- Automatski SSL/TLS
- Skalabilno
- Replit maintenance

### 2. DNS Konfiguracija za custom domain
**Potrebno:**
1. Pristup DNS control panelu za frigosistemtodosijevic.me
2. Dodati CNAME record:
   ```
   www.frigosistemtodosijevic.me → your-app.replit.app
   ```
3. Ili A record sa IP adresom Replit servera

### 3. Alternativni hosting
**Opcije:**
- Vercel
- Netlify
- Heroku
- DigitalOcean
- AWS

## Koraci za produkciju

### Korak 1: Replit Deployment
1. Otvorite Replit konzolu
2. Idite na "Deploy" tab
3. Kliknite "Deploy to Autoscale"
4. Aplikacija će biti dostupna na `*.replit.app` domenu

### Korak 2: Custom Domain (opcionalno)
1. Kontaktirajte hosting provajdera ili domain registrara
2. Tražite pristup DNS control panelu
3. Dodajte CNAME record:
   - Name: `www`
   - Value: `your-app.replit.app`
   - TTL: 300

### Korak 3: Production optimizacija
1. Postaviti environment varijable:
   ```
   NODE_ENV=production
   ```
2. Konfigurirati production database
3. Optimizovati rate limiting za produkciju

## Environment varijable za produkciju

```bash
# Database
DATABASE_URL=[production_database_url]

# Email
SMTP_HOST=mail.frigosistemtodosijevic.com
SMTP_PORT=465
SMTP_USER=[email_user]
SMTP_PASS=[email_password]

# SMS
TWILIO_ACCOUNT_SID=[twilio_sid]
TWILIO_AUTH_TOKEN=[twilio_token]
TWILIO_PHONE_NUMBER=[twilio_phone]

# Security
SESSION_SECRET=[random_secure_string]
```

## Testiranje produkcije

### Pre deployment:
1. Testiraj sve API endpoints
2. Proveri email notifikacije
3. Proveri SMS funkcionalnost
4. Testiraj sve user roles (admin, technician, customer, business_partner)

### Nakon deployment:
1. Testiraj pristup preko production URL-a
2. Proveri SSL certificat
3. Testiraj performance
4. Proveri database konekcije

## Monitoring i održavanje

### Replit Console:
- Resources usage
- Deployment logs
- Error tracking
- Performance metrics

### Dodatno monitoring:
- Setup uptime monitoring
- Error reporting (Sentry)
- Performance tracking
- Database monitoring

## Backup strategija

1. **Database backup:**
   - Automatski backup na Neon PostgreSQL
   - Eksport podataka jednom mjesečno

2. **Code backup:**
   - Git repository
   - Replit automatski backup

3. **Configuration backup:**
   - Environment varijable
   - SSL certificati
   - DNS postavke

## Procjena troškova

### Replit Autoscale:
- $0.035/GB-h za memory
- $0.18/cpu-h za CPU
- Očekivani mjesečni troškovi: $10-50

### Alternative:
- Vercel: $20/mjesec
- Netlify: $19/mjesec
- Heroku: $25/mjesec

## Zaključak

Aplikacija je potpuno spremna za produkciju. Preporučujem:
1. Koristiti Replit Deployment za početak
2. Testirati production environment
3. Konfigurirati custom domain nakon testiranja
4. Implementirati monitoring

Sve funkcionalnosti će raditi identično kao u development environment-u, ali bez HMR nestabilnosti.