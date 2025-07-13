# DNS Troubleshooting za www.frigosistemtodosijevic.me

## Analiza problema na osnovu screenshot-a

### Trenutno stanje:
- ✅ `frigosistemtodosijevic.me` - Verified na Replit-u
- ✅ `adminfst.me` - Verified na Replit-u
- ❌ `www.frigosistemtodosijevic.me` - Nije konfigurisan

### DNS zapisi koje je Replit dao:
```
Type: A
Hostname: @
Record: 34.111.179.208

Type: TXT
Hostname: @
Record: replit-verify=387845ef-9bbc-4c22-9417
```

## Problem
Replit DNS zapisi su konfigurisani za **glavni domen** (`@` = frigosistemtodosijevic.me), ali ne za **www subdomen**.

## Rješenje u cPanel-u

### 1. Dodaj A record za www subdomen
```
Type: A
Name: www
Points to: 34.111.179.208
TTL: 300
```

### 2. Alternativno - dodaj CNAME record
```
Type: CNAME
Name: www
Points to: frigosistemtodosijevic.me
TTL: 300
```

### 3. Provjeri postojeće DNS zapise
U cPanel DNS Zone Editor, provjeri da li postoji:
- A record za `www`
- CNAME record za `www`

### 4. Ukloni konfliktne zapise
Ako postoji neki drugi A ili CNAME record za `www`, ukloni ga prije dodavanja novog.

## Korak-po-korak instrukcije za cPanel

### 1. Prijavi se na cPanel
- Idi na hosting control panel
- Uloguj se sa credentials-ima

### 2. Otvori DNS Zone Editor
- Klikni na "DNS Zone Editor" ili "Zone Editor"
- Odaberi domen `frigosistemtodosijevic.me`

### 3. Dodaj A record za www
```
Type: A
Name: www
IPv4 Address: 34.111.179.208
TTL: 300 (default)
```

### 4. Sačuvaj promjene
- Klikni "Add Record" ili "Save"
- Promjene će biti aktivne za 5-15 minuta

## Testiranje nakon promjena

### Online DNS checker:
- https://www.whatsmydns.net/
- Unesi: `www.frigosistemtodosijevic.me`
- Provjeri da li vraća IP: `34.111.179.208`

### Browser test:
- Idi na `https://www.frigosistemtodosijevic.me`
- Trebao bi raditi kao i `https://frigosistemtodosijevic.me`

## Mogući problemi

### 1. Conflicting records
- Možda već postoji A record za `www` koji pokazuje na drugu IP adresu
- Potrebno je ukloniti stari i dodati novi

### 2. Propagacija DNS-a
- Može potrajati 24-48 sati za potpunu propagaciju
- Lokalno može raditi ranije (15-30 min)

### 3. Cloudflare ili CDN
- Ako koristiš Cloudflare, promjene treba napraviti tamo
- Provjeri da li je domain proxied ili DNS-only

## Dodatne provjere

### Provjeri trenutne DNS zapise:
```bash
# Provjeri A record
nslookup www.frigosistemtodosijevic.me

# Provjeri sve DNS zapise
dig www.frigosistemtodosijevic.me ANY
```

### Provjeri da li radi bez www:
```bash
# Ovo trebalo bi raditi
curl -I https://frigosistemtodosijevic.me

# Ovo trenutno ne radi
curl -I https://www.frigosistemtodosijevic.me
```

## Zaključak

Problem je što DNS zapisi u cPanel-u nisu konfigurisani za **www** subdomen. Glavni domen `frigosistemtodosijevic.me` radi jer je Replit konfigurisan za njega, ali `www.frigosistemtodosijevic.me` ne radi jer nema DNS record.

**Rješenje:** Dodaj A record za `www` u cPanel DNS Zone Editor.