# 🗄️ Backup Sistem - Instrukcije za Korišćenje

## Pregled

Ovaj sistem omogućava potpunu zaštitu podataka iz baze kroz kreiranje backup-ova i vraćanje podataka iz backup-a. Svi backup-ovi se čuvaju u JSON formatu u `./backups` direktorijumu.

## 📋 Dostupne Komande

### 1. Kreiranje Backup-a

```bash
# Potpuni backup (uključuje sve podatke)
tsx scripts/database-backup.ts create

# Backup bez notifikacija (lakši, brži)
tsx scripts/database-backup.ts create --skip-notifications
```

### 2. Pregled Backup-ova

```bash
# Prikazuje sve dostupne backup-ove
tsx scripts/database-backup.ts list
```

### 3. Vraćanje iz Backup-a

```bash
# Vraća sve podatke iz backup-a
tsx scripts/database-backup.ts restore ./backups/backup-2025-07-15T23-12-43-151Z.json

# Vraća podatke bez notifikacija
tsx scripts/database-backup.ts restore ./backups/backup-2025-07-15T23-12-43-151Z.json --skip-notifications
```

### 4. Automatski Backup

```bash
# Pokreće automatski backup sa čišćenjem starih backup-ova
tsx scripts/create-automatic-backup.ts
```

## 🔧 Šta Backup Čuva

Backup uključuje sledeće tabele:
- ✅ **Korisnici** - Svi korisnici sistema (admin, tehničari, klijenti, partneri)
- ✅ **Klijenti** - Svi klijenti sa kontakt informacijama
- ✅ **Uređaji** - Svi uređaji vezani za klijente
- ✅ **Servisi** - Svi servisi sa detaljima
- ✅ **Notifikacije** - Sve notifikacije (opciono)
- ✅ **Kategorije uređaja** - Svi tipovi uređaja
- ✅ **Proizvođači** - Svi proizvođači uređaja
- ✅ **Planovi održavanja** - Svi planovi održavanja
- ✅ **Narudžbe delova** - Sve narudžbe rezervnih delova

## 🚨 Važne Napomene

### Bezbednost
- **Backup fajlovi sadrže lozinke korisnika!** Čuvajte ih na sigurnom mestu
- Ne delite backup fajlove sa neovlašćenim osobama
- Redovno testirajte restore funkcionalnost

### Restore Proces
- **PAŽNJA**: Restore briše sve postojeće podatke pre vraćanja backup-a
- Uvek napravite novi backup pre restore-a
- Testirajte restore na test okruženju pre produkcije

### Automatski Backup
- Automatski backup čuva 30 dana istorije
- Stariji backup-ovi se automatski brišu
- Preporučuje se pokretanje jednom dnevno

## 📂 Struktura Backup Fajla

```json
{
  "timestamp": "2025-07-15T23:12:43.151Z",
  "version": "1.0.0",
  "tables": {
    "users": [...],
    "clients": [...],
    "appliances": [...],
    "services": [...],
    "notifications": [...],
    "applianceCategories": [...],
    "manufacturers": [...],
    "maintenanceSchedules": [...],
    "sparePartOrders": [...]
  }
}
```

## 🔄 Redovan Backup Proces

### Dnevni Backup
```bash
# Dodajte u cron job za automatsko pokretanje
0 2 * * * cd /path/to/project && tsx scripts/create-automatic-backup.ts
```

### Sedmični Backup
```bash
# Kreiranje backup-a svakog ponedeljka
0 2 * * 1 cd /path/to/project && tsx scripts/database-backup.ts create
```

## 🛠️ Troubleshooting

### Greška: "Cannot find module"
- Proverite da li ste u root direktorijumu projekta
- Pokrenite `npm install` za instalaciju dependencies

### Greška: "Database connection failed"
- Proverite da li je server pokretnut
- Proverite DATABASE_URL environment varijablu

### Backup fajl je prazan
- Proverite da li imate podatke u bazi
- Pokrenite `tsx scripts/database-backup.ts list` da vidite postojeće backup-ove

### Restore ne radi
- Proverite format backup fajla
- Pokrenite prvo `tsx scripts/database-backup.ts create` da testirate sistem

## 📞 Podrška

Ako imate problema sa backup sistemom:
1. Proverite da li su svi servisi pokrenuti
2. Testiradje sa malom količinom podataka
3. Proverite logove za detaljne greške
4. Kontaktirajte tehničku podršku

---

**Napomena**: Ovaj sistem je kreiran za PostgreSQL bazu podataka sa Drizzle ORM-om. Redovno testirajte backup i restore funkcionalnost da budete sigurni da vaši podaci su zaštićeni.