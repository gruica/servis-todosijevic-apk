# Infobip SMS Setup - Instrukcije za profesionalnu SMS platformu

## 🔧 Podešavanje Infobip SMS servisa

### Korak 1: Dobijanje API kredencijala
1. **Idite na vaš Infobip dashboard** (https://portal.infobip.com)
2. **Kliknite na "API keys"** u bočnom meniju
3. **Kreirajte novi API ključ** ili kopirajte postojeći
4. **Zapišite API ključ** - počinje sa App-xxx ili slično

### Korak 2: Konfiguracija u aplikaciji
Dodajte sledeće environment varijable:

```bash
# Infobip SMS konfiguracija
INFOBIP_API_KEY=your_api_key_here
INFOBIP_BASE_URL=https://api.infobip.com
```

### Korak 3: Testiranje
1. **Admin Panel → SMS Postavke**
2. **Kliknite "Infobip SMS Test"**
3. **Unesite broj telefona** (npr. +38267051141)
4. **Kliknite "Pošalji preko Infobip-a"**

## 📱 Redosled slanja SMS-a:

```
1. Telekom API (direktno sa vašeg broja)
2. GSM modem (fizički povezan)
3. ✅ Infobip SMS platforma
4. Messaggio (backup)
5. Twilio (krajnji fallback)
```

## 💰 Prednosti Infobip platforme:

### ✅ Profesionalne funkcije:
- **Globalna dostupnost** - SMS u 190+ zemalja
- **Visoka dostupnost** - 99.9% uptime
- **Detaljni izvештaji** - status svakog SMS-a
- **Brza dostava** - SMS se šalje za sekunde
- **Sender ID podrška** - možete koristiti svoje ime ili broj

### ✅ API funkcionalnosti:
- **Advanced SMS API** - kompletan kontrol nad slanjem
- **Webhook podrška** - automatsko praćenje statusa
- **Bulk SMS** - slanje hiljada SMS-ova odjednom
- **Scheduled SMS** - zakazivanje SMS-ova

### ✅ Za vaš biznis:
- **Sender ID: +38267051141** - SMS stižu sa vašeg broja
- **Lokalni routing** - optimizovan za Crnu Goru
- **Competitive pricing** - često povoljnije od lokalnih operatera
- **24/7 podrška** - profesionalna tehnička podrška

## 📊 Primer Infobip SMS formata:

```json
{
  "messages": [
    {
      "from": "+38267051141",
      "destinations": [
        {
          "to": "+38267123456"
        }
      ],
      "text": "Frigo Sistem: Vaš servis #123 je završen. Kontakt: 033 402 402"
    }
  ]
}
```

## 🔧 Troubleshooting:

### Problem: "API ključ nije konfigurisan"
**Rešenje:**
1. Proverite da li je `INFOBIP_API_KEY` postavljen
2. Restart aplikacije nakon dodavanja environment varijable
3. Proverite da API ključ počinje sa `App-` ili slično

### Problem: "Unauthorized" greška
**Rešenje:**
1. Proverite da li je API ključ valjan
2. Proverite IP whitelist u Infobip dashboard-u
3. Proverite da li je API ključ aktiviran

### Problem: "Insufficient balance"
**Rešenje:**
1. Idite na Infobip dashboard → Billing
2. Dodajte kredit na račun
3. Proverite trenutni balans

### Problem: "Invalid sender ID"
**Rešenje:**
1. Proverite da li je +38267051141 registrovan kao sender ID
2. Koristite alphanumerički sender ID (npr. "FrigoSistem")
3. Kontaktirajte Infobip support za registraciju broj

## 🚀 Aktivacija:

### Trenutno stanje:
- ✅ Kod je implementiran
- ✅ API endpoints su kreirani
- ✅ Admin test interfejs je spreman
- ⚠️ Potrebno je dodati INFOBIP_API_KEY

### Sledeći koraci:
1. **Unesite API ključ** iz Infobip dashboard-a
2. **Testirajte slanje** preko admin panela
3. **SMS-ovi će automatski** koristiti Infobip platformu

## 📞 Podrška:

**Infobip Support:**
- Email: support@infobip.com
- Phone: Lokalni broj za Crnu Goru
- Documentation: https://www.infobip.com/docs

**Aplikacija:**
- Admin Panel → SMS Postavke → Infobip SMS Test
- Logovi u konzoli za detaljne greške

---

**Napomena:** Infobip je profesionalna SMS platforma koja se koristi od strane velikih kompanija širom sveta. Pružiće vam najbolju dostupnost i funkcionalnost za vaš biznis.