# DNS Konfiguracija za frigosistemtodosijevic.me

## Problem
Domen www.frigosistemtodosijevic.me nije dostupan preko DNS-a i pokazuje grešku "Ovaj sajt nije dostupan" na Samsung Internet pregledniku.

## Uzrok
DNS zapisi nisu ispravno konfigurisani za www subdomen, što onemogućava pristup sajtu.

## Rješenje

### 1. Dodaj DNS zapise u hosting panelu

Za domen `frigosistemtodosijevic.me` trebate dodati sljedeće DNS zapise:

**A Record:**
- Name: `www`
- Type: `A`
- Value: `[IP_ADRESA_SERVERA]`
- TTL: 300

**CNAME Record (alternativa):**
- Name: `www`
- Type: `CNAME`
- Value: `frigosistemtodosijevic.me`
- TTL: 300

### 2. Provjeri trenutne DNS postavke

Možete koristiti online DNS checker alate:
- https://www.whatsmydns.net/
- https://dnschecker.org/
- https://www.nslookup.io/

### 3. Ako koristite Cloudflare

1. Ulogujte se na Cloudflare
2. Odaberite domen `frigosistemtodosijevic.me`
3. Idite na DNS tab
4. Dodajte A record za `www`:
   - Type: A
   - Name: www
   - IPv4 address: [IP_ADRESA_SERVERA]
   - Proxy status: Proxied (narandžasta ikona)

### 4. Ako koristite drugi DNS provider

Kontaktirajte vašeg domain registrara ili hosting providera da:
- Postavite A record za `www` subdomen
- Usmjerite ga na IP adresu vašeg servera
- Ukoliko ne znate IP adresu, kontaktirajte Replit support

### 5. Propagacija DNS-a

- DNS promjene mogu potrajati 24-48 sati za potpunu propagaciju
- Lokalne promjene su obično vidljive za 15-30 minuta
- Možete očistiti DNS cache na vašem uređaju

### 6. Test konfiguracije

Nakon što dodaste DNS zapise, testirajte:

```bash
# Linux/Mac
nslookup www.frigosistemtodosijevic.me

# Windows
nslookup www.frigosistemtodosijevic.me

# Online
# Koristite https://www.whatsmydns.net/
```

## Napomene

- Bez valjanog DNS zapisa, domen neće biti dostupan
- Ovo je problem sa DNS konfigurацijom, ne sa aplikацijom
- Aplikacija radi lokalno na Replit-u, ali trebate DNS da bude dostupna javno

## Dodatne informacije za troubleshooting

### Provjera DNS-a iz terminala (ako je dostupan)
```bash
# Provjeri A record
host www.frigosistemtodosijevic.me

# Provjeri sve DNS zapise
host -a www.frigosistemtodosijevic.me
```

### Alternativni pristup
Ako ne možete konfigurirati DNS, možete:
1. Koristiti direktno Replit URL za pristup
2. Koristiti IP adresu servera direktno
3. Konfigurirati CNAME preko CDN servisa poput Cloudflare