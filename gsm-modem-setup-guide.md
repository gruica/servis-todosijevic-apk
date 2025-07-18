# GSM Modem Setup Guide - Frigo Sistem

## Pregled

Ovaj vodič objašnjava kako da postavite GSM modem sa SIM karticom 067028666 za slanje SMS poruka kroz Frigo Sistem aplikaciju.

## Fizička konekcija

### Korak 1: Priprema SIM kartice
- SIM kartica: 067028666
- PIN kod treba da bude uklonjen (ili zapamćen za konfiguraciju)
- Proverite da li je kartica aktivna i ima kredit

### Korak 2: Konekcija modema
- Povežite GSM modem/MiFi uređaj na USB port
- Sačekajte da se uređaj inicijalizuje (LED indikatori)
- Uređaj će se pojaviti kao `/dev/ttyUSB0`, `/dev/ttyACM0` ili slično

### Korak 3: Verifikacija konekcije
Pokrenite test skriptu:
```bash
./test-gsm-modem.sh
```

## Konfiguracija kroz Admin Panel

### Korak 1: Pristup admin panelu
- Idite na: `http://localhost:3000/admin`
- Prijavite se kao administrator

### Korak 2: SMS postavke
- Idite na "SMS Settings" stranicu
- Odaberite "GSM Modem" kao provajder

### Korak 3: Konfiguracija parametara
- **Port**: Unesite `/dev/ttyUSB0` ili port koji je detektovan
- **Baud Rate**: 9600 (standardno)
- **Phone Number**: +38267028666
- **Fallback to Twilio**: Uključite za rezervni sistem
- Kliknite "Configure GSM Modem"

## API Endpoints

### Dostupni portovi
```
GET /api/gsm-modem/ports
```

### Konfiguracija modema
```
POST /api/gsm-modem/configure
{
  "provider": "gsm_modem",
  "port": "/dev/ttyUSB0",
  "baudRate": 9600,
  "phoneNumber": "+38267028666",
  "fallbackToTwilio": true
}
```

### Status modema
```
GET /api/gsm-modem/status
```

### Test slanja SMS-a
```
POST /api/gsm-modem/test
{
  "recipient": "+38267123456"
}
```

## Troubleshooting

### Problem: Modem se ne detektuje
- Proverite USB konekciju
- Proverite da li je driver instaliran
- Pokušajte drugi USB port

### Problem: Nema mreže
- Proverite signal (LED indikatori)
- Proverite SIM karticu
- Proverite PIN kod

### Problem: Slanje ne funkcioniše
- Proverite kredit na SIM kartici
- Proverite format broja telefona
- Proverite AT komande u log-u

## Hibridni sistem

Aplikacija koristi hibridni SMS sistem:
1. **Primarni**: GSM modem (lokalni, bez troška)
2. **Fallback**: Twilio (međunarodni, sa troškovima)

### Prednosti GSM modema
- Nema troškova po poruci
- Lokalni broj (067028666)
- Brže slanje
- Nema zavisnost od interneta za slanje

### Kada se koristi fallback
- GSM modem nije dostupan
- Nema signala
- Greška u slanju

## Monitoring i logovanje

Sve aktivnosti GSM modema se loguju sa prefiksom `[GSM MODEM]`:
```
[GSM MODEM] Inicijalizacija GSM Modem servisa
[GSM MODEM] Konfiguracija modema: port=/dev/ttyUSB0, baudRate=9600, phone=+38267028666
[GSM MODEM] ✅ Serial port otvoren
[GSM MODEM] ✅ Modem uspešno inicijalizovan
[GSM MODEM] Slanje SMS-a na +38267123456: Test poruka
[GSM MODEM] ✅ SMS uspešno poslat
```

## Održavanje

### Redovno
- Proverite kredit na SIM kartici
- Proverite signal strength
- Proverite log fajlove

### Mesečno
- Restart GSM modem konekcije
- Proverite statistike slanja
- Ažurirajte konfiguraciju ako je potrebno

## Napomene za Replit

U Replit okruženju, fizička USB konekcija možda neće biti dostupna. U tom slučaju:
- Koristite Twilio kao primarni provajder
- Testirajte GSM modem funkcionalnost na lokalnom serveru
- Koristite simulaciju za development

## Kontakt

Za tehničku podršku:
- Telefon: +382 67 028 666
- Email: jelena@frigosistemtodosijevic.me