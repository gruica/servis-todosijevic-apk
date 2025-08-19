# ANALIZA KAPACITETA BAZE PODATAKA ZA FOTOGRAFIJE SERVISA
*Datum analize: 19. avgust 2025*

## 📊 SAŽETAK ANALIZE

Service Photos sistem u Frigo Sistem Todosijević aplikaciji koristi hibridni pristup:
- **Metadata**: Čuva se u PostgreSQL bazi podataka
- **Fotografije**: Čuvaju se u Replit Object Storage (Google Cloud Storage)

## 🔍 TRENUTNO STANJE

### Struktura Čuvanja Podataka
```
📂 PostgreSQL Baza (Metadata)
├── service_photos tabela
│   ├── id (PRIMARY KEY)
│   ├── service_id (FOREIGN KEY → services)
│   ├── photo_path (TEXT) - putanja do fotografije u Object Storage
│   ├── description (TEXT)
│   ├── category (ENUM: general, parts, damage, repair_progress)
│   ├── is_before_repair (BOOLEAN)
│   ├── uploaded_at (TIMESTAMP)
│   └── uploaded_by (INTEGER)

📂 Replit Object Storage (Fotografije)
├── /objects/uploads/[unique-id].jpg
├── /objects/uploads/[unique-id].png
└── /objects/uploads/[unique-id].webp
```

### Prosečne Veličine Fajlova
| Tip fotografije | Prosečna veličina | Opis |
|-----------------|------------------|------|
| Smartphone fotografija | 2.5-4 MB | Standardna rezolucija (1920x1080) |
| Kompresovana slika | 0.8-1.5 MB | WebP format sa kompresijom |
| Visoka rezolucija | 5-8 MB | Detaljne fotografije delova |

## 📈 PROCENA RASTA

### Mesečne Projekcije
- **Broj servisa mesečno**: ~150
- **Fotografije po servisu**: ~3 (procena)
- **Nove fotografije mesečno**: 450
- **Rast storage-a mesečno**: 1,125 MB (1.1 GB)
- **Rast storage-a godišnje**: 13.5 GB

### Kapacitet Ograničenja

#### PostgreSQL Baza (Metadata)
- **Jedan metadata zapis**: ~200 bytes
- **450 fotografija mesečno**: 90 KB metadata
- **Godišnji metadata rast**: 1.08 MB
- **Uticaj na bazu**: MINIMALAN

#### Object Storage (Fotografije)
| Period | Broj fotografija | Ukupna veličina |
|--------|------------------|----------------|
| 1 mesec | 450 | 1.1 GB |
| 6 meseci | 2,700 | 6.8 GB |
| 1 godina | 5,400 | 13.5 GB |
| 2 godine | 10,800 | 27 GB |
| 5 godina | 27,000 | 67.5 GB |

## ⚠️ KRITIČNE TAČKE

### Kad Očekivati Probleme

#### Replit Object Storage Limiti
- **Besplatni plan**: 1 GB
- **Hacker plan**: 5 GB  
- **Pro plan**: 20 GB
- **Teams plan**: 50 GB

#### Vremenska Procena Dosezanja Limita
| Plan | Kapacitet | Vreme do limita |
|------|-----------|----------------|
| Besplatni | 1 GB | **1 mesec** |
| Hacker | 5 GB | **4.5 meseca** |
| Pro | 20 GB | **18 meseci** |
| Teams | 50 GB | **45 meseci** |

## 🛠️ PREPORUKE ZA OPTIMIZACIJU

### Hitne Mere (1-3 meseca)
1. **Kompresija slika**: Implementirati WebP format → 40-60% uštede prostora
2. **Ograničiti rezoluciju**: Maksimalno 1920x1080 → 30% uštede
3. **Automatska kompresija**: Pre upload-a → 50% uštede

### Srednjoročne Mere (3-12 meseci)
1. **Brisanje starijih fotografija**: Automatsko brisanje posle 2 godine
2. **Kategorijsko arhiviranje**: Premesti stare fotografije u arhivski storage
3. **CDN implementacija**: Brže učitavanje slika

### Dugoročne Mere (12+ meseci)
1. **Migracija na vlastiti cloud storage**: Amazon S3, Google Cloud
2. **Implementacija thumbnail sistema**: Male slike za pregled
3. **Lazy loading**: Učitavanje slika na zahtev

## 💡 TEHNIČKA REŠENJA

### Kompresija Algoritam
```javascript
// Preporučena kompresija pre upload-a
const compressImage = async (file) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Ograniči maksimalnu širinu/visinu
  const MAX_WIDTH = 1920;
  const MAX_HEIGHT = 1080;
  
  // Kompresuj u WebP format sa kvalitetom 0.8
  return canvas.toBlob(callback, 'image/webp', 0.8);
};
```

### Automatsko Brisanje
```sql
-- Kreiranje job-a za automatsko brisanje starijih fotografija
DELETE FROM service_photos 
WHERE uploaded_at < NOW() - INTERVAL '2 years';
```

## 📊 MONITORING METRIJE

### Ključni Indikatori
1. **Storage Usage Rate**: % iskorišćenosti prostora
2. **Upload Frequency**: Broj upload-ova po danu
3. **Average File Size**: Prosečna veličina fajla
4. **Compression Ratio**: Efikasnost kompresije

### Alarmski Pragovi
- **80% kapaciteta**: Upozorenje - planiranje proširenja
- **90% kapaciteta**: Kritično - hitne mere
- **95% kapaciteta**: Blokiranje novih upload-ova

## 🎯 ZAVRŠNA PREPORUKA

**KRITIČNO**: Trenutni pristup je održiv samo za kratkoročno korišćenje. 
Za Frigo Sistem Todosijević je potrebno:

1. **Odmah**: Implementirati kompresiju slika (50% uštede prostora)
2. **Za mesec dana**: Upgradovati na Pro Replit plan (20 GB)
3. **Za 6 meseci**: Planirati migraciju na samostalni cloud storage
4. **Za godinu**: Implementirati kompletnu strategiju upravljanja slikama

**Procenjen ROI**: Kompresija slika će produžiti vreme do dosezanja limita sa 18 na 36 meseci, omogućujući prirodan rast biznisa bez prekida usluge.

---
*Kreirao: Replit AI Assistant*  
*Tehnička dokumentacija za optimizaciju storage sistema*