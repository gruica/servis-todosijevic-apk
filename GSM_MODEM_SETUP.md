# GSM Modem Setup - Instrukcije za direktno slanje SMS-a

## 🔧 Potreban hardware:

### 1. **USB GSM Modem**
   - **Huawei E173** (preporučeno)
   - **Huawei E3131** 
   - **ZTE MF823**
   - **Bilo koji USB stick sa GSM funkcijom**

### 2. **SIM kartica**
   - Vaša postojeća SIM kartica (067051141)
   - Ili nova SIM kartica sa aktivnim paketom

## 📋 Korak po korak setup:

### Korak 1: Fizičko povezivanje
1. **Ubacite SIM karticu** u GSM modem
2. **Povežite modem** u USB port servera/računara
3. **Sačekajte 30-60 sekundi** da se modem registruje

### Korak 2: Proverite da li sistem vidi modem
```bash
# Linux komande za proveru
lsusb | grep -i huawei  # ili ZTE, ili naziv vašeg modema
ls /dev/ttyUSB*         # Treba da vidite /dev/ttyUSB0 ili slično
```

### Korak 3: Test komunikacije
```bash
# Jednostavan test AT komande
echo "AT" > /dev/ttyUSB0
# Ako radi, videćete "OK" odgovor
```

### Korak 4: Podešavanje u aplikaciji
1. Otvorite **Admin Panel** → **SMS Postavke**
2. Kliknite **"Testiraj Telekom SMS"**
3. Unesite svoj broj i kliknite **"Pošalji test SMS"**

## 🔍 Troubleshooting:

### Problem: "GSM modem nije pronađen"
**Rešenje:**
- Proverite USB konekciju
- Restart modema (izvaditi/ubaciti)
- Proverite da li je SIM kartica ispravno ubačena

### Problem: "No permission to access /dev/ttyUSB0"
**Rešenje:**
```bash
sudo chmod 666 /dev/ttyUSB0
# ili dodajte korisnika u dialout grupu
sudo usermod -a -G dialout $USER
```

### Problem: SIM kartica traži PIN
**Rešenje:**
- Onemogućite PIN na SIM kartici (ubacite u telefon → Settings → SIM → Disable PIN)
- Ili koristite AT komandu: `AT+CPIN=1234` (gde je 1234 vaš PIN)

## 📱 Alternativni pristup - Android telefon kao modem:

### Opcija 1: USB Tethering
1. Povežite Android telefon preko USB-a
2. Omogućite **USB Tethering** u postavkama
3. Instalirajte aplikaciju koja omogućava SMS preko AT komandi

### Opcija 2: Bluetooth modem
1. Uparite telefon preko Bluetooth-a
2. Koristite aplikacije poput **BlueSoleil** ili **SerialBT**

## 💰 Cena i dostupnost:

### USB GSM Modemi:
- **Huawei E173**: €25-40 (polovan)
- **Huawei E3131**: €30-50 (nov)
- **ZTE MF823**: €20-35 (polovan)

### Gde kupiti:
- **KupujemProdajem.com** (polovan)
- **Gigatron**, **Tehnomanija** (nov)
- **AliExpress** (jeftiniji, duža dostava)

## ✅ Prednosti GSM modem-a:

1. **Direktno slanje** sa vašeg broja (067051141)
2. **Bez mesečnih troškova** (osim SMS-ova)
3. **Potpuna kontrola** nad slanjem
4. **Backup opcija** ako Internet padne
5. **Lokalno slanje** - brže i pouzdanije

## 🔄 Kako funkcioniše u aplikaciji:

```
1. Aplikacija pokušava Telekom API ❌
2. Prelazi na GSM modem ✅
3. Šalje SMS direktno sa 067051141
4. Klijent prima SMS sa vašeg broja
```

## 📞 Podrška:

Ako imate probleme sa setup-om:
1. Proverite da li modem radi u telefonu/računaru
2. Testirajte u aplikaciji (**Admin Panel** → **SMS Postavke** → **GSM Test**)
3. Pogledate logove u konzoli za detaljne greške

---

**Napomena:** Ova funkcionalnost je već implementirana u aplikaciji. Potrebno je samo fizičko povezivanje GSM modem-a da počne da radi automatski.