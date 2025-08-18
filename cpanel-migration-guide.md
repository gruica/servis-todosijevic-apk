# VODIČ ZA MIGRACIJU NA CPANEL
## Servis Todosijević - Prebacivanje sa Replit na cPanel

**Datum kreiranja:** 17. januar 2025  
**Tip aplikacije:** Full-stack Node.js sa PostgreSQL  
**Trenutno okruženje:** Replit  
**Ciljno okruženje:** cPanel hosting

---

## 1. ANALIZA KOMPATIBILNOSTI

### 1.1 Trenutna Tehnička Arhitektura
- **Backend:** Node.js 20+ sa Express.js
- **Frontend:** React (Vite build)
- **Database:** PostgreSQL (Neon serverless)
- **File Storage:** Local file system
- **Build System:** Vite + TypeScript
- **Dependencies:** 75+ npm paketa

### 1.2 cPanel Podrška
✅ **Podržano:**
- Node.js aplikacije (verzije 14-20)
- Static file hosting
- MySQL/MariaDB baza podataka
- File manager
- SSL sertifikati
- Subdomeni

⚠️ **Ograničenja:**
- PostgreSQL - NIJE standardno podržan
- WebSocket connections - ograničeno
- Long-running processes - ograničeno
- Memory limits - obično 512MB-2GB

❌ **Problematično:**
- IMAP email sync (background processes)
- Real-time notifikacije
- Capacitor mobile build

---

## 2. MIGRACIJA STRATEGIJA

### 2.1 Opcija A: Prilagođavanje za cPanel (Preporučeno)
**Izmene potrebne:**
- **Database:** PostgreSQL → MySQL/MariaDB
- **Session storage:** Memory → Database sessions
- **File uploads:** Optimizacija za cPanel strukture
- **Background jobs:** Cron job alternativa

### 2.2 Opcija B: VPS/Dedicated Server
**Bolje rešenje za kompleksnost:**
- Potpuna kontrola nad serverom
- PostgreSQL podrška
- Background processes
- WebSocket podrška

### 2.3 Opcija C: Cloud Hosting (DigitalOcean, AWS)
**Najfleksibilnije:**
- Skalabilnost
- Svi servisi podržani
- Docker kontejneri
- CI/CD pipeline

---

## 3. KORAK-PO-KORAK MIGRACIJA

### 3.1 Priprema za Migraciju

**1. Database Schema Konverzija**
```sql
-- PostgreSQL → MySQL konverzija
-- serial → AUTO_INCREMENT
-- text → TEXT/VARCHAR
-- boolean → TINYINT(1)
-- timestamp → DATETIME
-- jsonb → JSON (MySQL 5.7+)
```

**2. Kod Adaptacija**
```javascript
// Izmena Drizzle konfiguracije
// PostgreSQL driver → MySQL2 driver
// Syntax razlike u query-ima
```

**3. Build Optimizacija**
```bash
# Production build za cPanel
npm run build
# Output: dist/ folder za upload
```

### 3.2 cPanel Setup Process

**Korak 1: Node.js App Setup**
1. cPanel → Node.js Apps
2. Kreiranje nove Node.js aplikacije
3. Upload build fajlova
4. npm install dependencies

**Korak 2: Database Setup**
1. cPanel → MySQL Databases
2. Kreiranje nove baze
3. Import schema (konvertovan)
4. Database user permissions

**Korak 3: Domain Configuration**
1. Subdomain setup (app.vašdomen.com)
2. SSL sertifikat
3. .htaccess rules za SPA routing

**Korak 4: File Permissions**
```bash
# Set proper permissions
chmod 755 public_html/
chmod 644 static files
chmod 755 executable files
```

### 3.3 Environment Variables
```bash
# cPanel environment setup
DATABASE_URL=mysql://user:pass@localhost/dbname
NODE_ENV=production
EMAIL_HOST=mail.yourdomain.com
# Ostale environment varijable
```

---

## 4. POTREBNE IZMENE KODA

### 4.1 Database Layer Changes
```typescript
// drizzle.config.ts - MySQL adapter
import { mysql2 } from 'drizzle-orm/mysql2';

// Schema adaptacije
// PostgreSQL specifične funkcije → MySQL ekvivalenti
```

### 4.2 Session Management
```typescript
// Izmena sa memory store na database sessions
import connectPg from 'connect-pg-simple'; // REMOVE
import MySQLStore from 'express-mysql-session'; // ADD
```

### 4.3 File Upload Paths
```typescript
// Adaptacija za cPanel file strukture
const uploadPath = process.env.NODE_ENV === 'production' 
  ? '/home/username/public_html/uploads'
  : './uploads';
```

---

## 5. PERFORMANCE OPTIMIZACIJE

### 5.1 cPanel Specifične Optimizacije
- **Static file caching** - .htaccess rules
- **Gzip compression** - server level
- **Database connection pooling** - MySQL optimizacije
- **Memory management** - kod optimizacije

### 5.2 Build Optimizacija
```javascript
// vite.config.ts optimizacije za production
export default defineConfig({
  build: {
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          admin: ['./src/pages/admin/*']
        }
      }
    }
  }
});
```

---

## 6. PROCENA TROŠKOVA I VREMENA

### 6.1 Development Time
**Za migraciju na cPanel:**
- Database konverzija: 2-3 dana
- Kod adaptacija: 3-4 dana  
- Testing i debugging: 2-3 dana
- **UKUPNO: 7-10 dana**

**Za VPS migraciju:**
- Server setup: 1 dan
- Code deployment: 1 dan
- Testing: 1 dan
- **UKUPNO: 3 dana**

### 6.2 Hosting Troškovi (mesečno)
- **cPanel shared hosting:** €5-15/mesec
- **VPS (DigitalOcean):** €15-25/mesec
- **Managed VPS:** €25-50/mesec

---

## 7. RIZICI I OGRANIČENJA

### 7.1 cPanel Ograničenja
⚠️ **Kritični rizici:**
- **Memory limits** - aplikacija može biti prekompieksna
- **Process timeouts** - dugotrajne operacije
- **Database limits** - connection limits
- **File system restrictions** - upload ograničenja

### 7.2 Funkcionalnosti u Riziku
- **Email IMAP sync** - možda neće raditi stabilno
- **Real-time features** - ograničeno
- **Mobile app build** - neće biti moguć
- **Background cron jobs** - ograničeno

---

## 8. ALTERNATIVNA REŠENJA

### 8.1 Hybrid Approach
- **Frontend** → cPanel static hosting
- **Backend API** → VPS ili cloud
- **Database** → Cloud database (PlanetScale, Neon)

### 8.2 Dockerized Deployment
```dockerfile
# Docker container za laku migraciju
FROM node:18-alpine
COPY . .
RUN npm install && npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 9. PREPORUKE

### 9.1 Glavna Preporuka
**NE preporučujem cPanel** za ovu aplikaciju jer:
- Previše je kompleksna za shared hosting
- PostgreSQL zavisnost
- Background processes potrebni
- Real-time funkcionalnosti

### 9.2 Bolje Alternative
1. **VPS (DigitalOcean Droplet)** - €15/mesec, potpuna kontrola
2. **Vercel + Neon** - serverless, PostgreSQL podržan
3. **Railway.app** - jednostavna migracija sa Replit-a
4. **Heroku** - managed hosting, database uključena

### 9.3 Najbrže Rešenje
**Railway.app migration:**
- 1-2 sata za migraciju
- PostgreSQL podržan
- GitHub deployment
- Minimal kod izmene

---

## 10. SLEDEĆI KORACI

### 10.1 Ako Ipak Želite cPanel
1. **Database konverzija** PostgreSQL → MySQL
2. **Testing** na local MySQL setup-u
3. **Code refactoring** za MySQL
4. **cPanel upload** i konfiguracija

### 10.2 Preporučeni Put
1. **VPS setup** (DigitalOcean €15/mesec)
2. **Docker deployment** - jednostavno
3. **Domain pointing** - DNS konfiguracija
4. **SSL setup** - Let's Encrypt

Da li želite da idemo putem cPanel migracije (kompleksno) ili preporučujem bolju alternativu kao što je VPS?