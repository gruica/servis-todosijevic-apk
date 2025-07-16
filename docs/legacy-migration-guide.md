# Vodič za migraciju podataka iz starog sistema

## Pregled

Ovaj vodič objašnjava kako da uvezete podatke iz starog Excel sistema u novu aplikaciju za upravljanje servisima. Sistem automatski prepoznaje skraćenice gradova i različite nazive kolona.

## Podržane skraćenice gradova

Sistem automatski konvertuje sledeće skraćenice:

| Skraćenica | Pun naziv     |
|------------|---------------|
| TV         | Tivat         |
| KO         | Kotor         |
| BD         | Budva         |
| PG         | Podgorica     |
| NK         | Nikšić        |
| PL         | Pljevlja      |
| HN         | Herceg Novi   |
| BA         | Bar           |
| UL         | Ulcinj        |
| CT         | Cetinje       |
| BJ         | Bijelo Polje  |
| RO         | Rožaje        |
| PV         | Plav          |
| ZB         | Žabljak       |
| DG         | Danilovgrad   |
| MK         | Mojkovac      |
| KL         | Kolašin       |
| BE         | Berane        |
| AN         | Andrijevica   |
| PZ         | Plužine       |
| SA         | Šavnik        |
| GO         | Gusinje       |
| PE         | Petnjica      |

## Podržane skraćenice tipova aparata

Sistem automatski konvertuje sledeće skraćenice za tipove aparata:

| Skraćenica | Pun naziv                |
|------------|--------------------------|
| SM         | Sudo mašina              |
| VM         | Veš mašina               |
| VM KOMB    | Kombinovana veš mašina   |
| SM UG      | Ugradna sudo mašina      |
| frižider   | Frižider                 |
| šporet     | Šporet                   |
| rerka      | Rerka                    |
| toster     | Toster aparat            |
| klima      | Klima uređaj             |
| inverter   | Inverter klima           |

*Napomena: Sistem prepoznaje i različite varijante pisanja (velikim slovima, sa/bez tačaka, kratice).*

## Korak po korak migracija

### 1. Priprema Excel fajla

**Format koji sistem prepoznaje:**

#### Za klijente:
```
| Klijent / Ime i prezime | Telefon / Mob | Grad | Adresa | Email |
|-------------------------|---------------|------|--------|-------|
| Marko Petrović          | 069123456     | TV   | Ulica 1| email |
| Ana Nikolić             | 067654321     | KO   | Ulica 2| email |
```

#### Za uređaje:
```
| Klijent | Uređaj/Tip | Proizvođač/Marka | Model | Serijski broj | Napomena |
|---------|------------|------------------|-------|---------------|----------|
| Marko   | SM         | Samsung          | DW50K | ABC123        | Ne pere  |
| Ana     | VM KOMB    | Bosch            | WKD   | DEF456        | Ne suši  |
```

### 2. Analiza postojećeg fajla

Pokrenite analizu da vidite strukturu vašeg fajla:

```bash
tsx scripts/import-legacy-data.ts analyze vaš_fajl.xlsx
```

Ova komanda će pokazati:
- Nazive kolona u vašem fajlu
- Kako se mapiraju u sistem
- Primer podataka
- Listu gradova

### 3. Priprema podataka za uvoz

#### A) Priprema klijenata
```bash
tsx scripts/import-legacy-data.ts clients vaš_fajl.xlsx klijenti_za_uvoz.xlsx
```

#### B) Priprema uređaja
```bash
tsx scripts/import-legacy-data.ts appliances vaš_fajl.xlsx uredjaji_za_uvoz.xlsx
```

### 4. Uvoz u aplikaciju

#### A) Uvoz klijenata
1. Idite na admin panel u aplikaciji
2. Izaberite "Uvoz/Izvoz" → "Uvoz klijenata"
3. Otpremite `klijenti_za_uvoz.xlsx`
4. Sistem će prikazati rezultate uvoza

#### B) Uvoz uređaja
1. **Važno**: Prvo uvezite klijente!
2. Idite na "Uvoz/Izvoz" → "Uvoz uređaja"
3. Otpremite `uredjaji_za_uvoz.xlsx`
4. Sistem će automatski povezati uređaje sa klijentima

## Fleksibilni nazivi kolona

Sistem prepoznaje različite nazive kolona:

### Klijenti:
- **Ime**: Klijent, Ime i prezime, Vlasnik, Ime
- **Telefon**: Telefon, Broj telefona, Mob, Tel
- **Grad**: Grad, Mesto, Lokacija
- **Adresa**: Adresa, Ulica

### Uređaji:
- **Kategorija**: Uređaj, Tip uređaja, Aparat, Kategorija, Tip aparata
- **Proizvođač**: Proizvođač, Marka, Brend
- **Model**: Model, Tip
- **Serijski broj**: Serijski broj, SN, Serial
- **Napomene**: Napomena, Opis, Kvar, Problem, Opis kvara

## Napredne funkcionalnosti

### Automatsko kreiranje kategorija i proizvođača
- Sistem automatski kreira nove kategorije uređaja
- Proizvođači se dodaju ako ne postoje
- Nema potrebe za unapred pripremom

### Inteligentno mapiranje tipova aparata
- Sistem prepoznaje skraćenice (SM → Sudo mašina)
- Razlikuje slične tipove (VM vs VM KOMB)
- Rešava varijante pisanja (velikim/malim slovima)
- Automatski mapira česte nazive (frižider → Frižider)

### Validacija podataka
- Telefon mora imati minimalno 6 cifara
- Ime mora imati minimalno 2 karaktera
- Email mora biti validan format (opciono)

### Rukovanje greškama
- Sistem prikazuje detaljne greške sa brojem reda
- Možete popraviti greške i ponovo uvesti
- Duplikati se automatski filtriraju

## Primer korišćenja

```bash
# 1. Analiziraj postojeći fajl
tsx scripts/import-legacy-data.ts analyze stari_sistem.xlsx

# 2. Pripremi klijente
tsx scripts/import-legacy-data.ts clients stari_sistem.xlsx klijenti.xlsx

# 3. Pripremi uređaje
tsx scripts/import-legacy-data.ts appliances stari_sistem.xlsx uredjaji.xlsx

# 4. Uvezi preko web interfejsa
```

## Preporuke za velike baze podataka

1. **Podeli fajlove** na maksimalno 1000 redova
2. **Testiranje** - prvo testiraj sa 10-20 redova
3. **Backup** - napravi backup baze pre uvoza
4. **Postupnost** - uvezi klijente pa tek onda uređaje
5. **Provera** - proveri uvoz nakon svakog koraka

## Rešavanje problema

### Česte greške:
- **"Klijent nije pronađen"** - prvo uvezite klijente
- **"Broj telefona nije valjan"** - proverite format telefona
- **"Grad nije mapiran"** - dodaćemo novu skraćenicu
- **"Tip aparata nepoznat"** - proverite mapiranje tipova u dokumentaciji

### Dobijanje podrške:
- Poslati možete primer Excel fajla za analizu
- Možemo dodati nove skraćenice gradova i tipova aparata
- Možemo prilagoditi mapiranje kolona
- Možemo dodati nova mapiranja za specijalne tipove aparata

## Zaključak

Sistem je prilagođen za rad sa podacima iz starog sistema i automatski rešava većinu problema sa formatiranjem i mapiranjem podataka. Proces je siguran i omogućava postupnu migraciju podataka uz detaljno izveštavanje o greškama.