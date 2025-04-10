import { db } from "../server/db";
import { clients } from "../shared/schema";
import { eq } from "drizzle-orm";

/**
 * Ova skripta analizira podatke klijenata i popravlja potencijalne probleme
 * koji mogu uzrokovati pad renddera u klijentskom interfejsu.
 * 
 * Problem se dogodio nakon uvoza Excel tabele, što je verovatno unelo
 * nevalidne ili nekonzistentne podatke u bazu.
 */
async function fixClientsData() {
  console.log("Počinje analiza podataka klijenata...");
  
  try {
    // 1. Prvo dohvatimo sve klijente
    const allClients = await db.select().from(clients);
    console.log(`Ukupno pronađeno ${allClients.length} klijenata u bazi.`);
    
    // 2. Provera pogrešnih ili null vrednosti
    let problemsFound = 0;
    let clientsFixed = 0;
    
    for (const client of allClients) {
      let hasProblems = false;
      let updates: Record<string, any> = {};
      
      // Problemi s tipom podataka za fullName (treba da bude string)
      if (typeof client.fullName !== 'string' && client.fullName !== null) {
        console.log(`Klijent ID ${client.id}: fullName nije ispravan tip (${typeof client.fullName})`);
        hasProblems = true;
        updates.fullName = String(client.fullName || "Nepoznat klijent");
      }
      
      // Nedostajući telefon (obavezan podatak)
      if (!client.phone) {
        console.log(`Klijent ID ${client.id}: nedostaje telefon`);
        hasProblems = true;
        updates.phone = "000 000 000"; // placeholder koji se može kasnije urediti
      }
      
      // Specijalni znakovi u poljima koja mogu srušiti UI
      if (client.fullName && /[^\p{L}\p{N}\p{Z}\p{P}]/u.test(client.fullName)) {
        console.log(`Klijent ID ${client.id}: fullName sadrži problematične znakove`);
        hasProblems = true;
        updates.fullName = client.fullName.replace(/[^\p{L}\p{N}\p{Z}\p{P}]/gu, '');
      }

      // Email može biti null, ali ako postoji mora biti ispravan format
      if (client.email && typeof client.email === 'string' && !/^[^@]+@[^@]+\.[^@]+$/.test(client.email)) {
        console.log(`Klijent ID ${client.id}: email nije u ispravnom formatu: ${client.email}`);
        hasProblems = true;
        updates.email = null; // privremeno postavljamo na null dok korisnik ne unese ispravan email
      }
      
      // Ako imamo probleme, ažuriramo klijenta
      if (hasProblems) {
        problemsFound++;
        try {
          console.log(`Popravljam klijenta ID ${client.id}`);
          await db.update(clients).set(updates).where(eq(clients.id, client.id));
          clientsFixed++;
        } catch (updateError) {
          console.error(`Greška pri ažuriranju klijenta ID ${client.id}:`, updateError);
        }
      }
    }
    
    console.log(`Analiza završena. Pronađeno ${problemsFound} problematičnih klijenata.`);
    console.log(`Uspešno popravljeno ${clientsFixed} klijenata.`);
    
    if (problemsFound === 0) {
      console.log("Nisu pronađeni problemi sa strukturom podataka. Problem može biti sa količinom podataka ili u klijentu.");
      
      // Kao alternativa, možemo vratiti podatke na sigurnu podrazumevanu vrednost
      if (allClients.length > 100) {
        console.log("Baza podataka sadrži mnogo klijenata, što može uzrokovati probleme s performansama.");
        console.log("Možete razmotriti implementaciju paginacije na klijentskoj strani.");
      }
    }
    
  } catch (error) {
    console.error("Greška pri izvršavanju skripte:", error);
  }
}

// Izvršavamo skriptu
fixClientsData()
  .then(() => {
    console.log("Skripta izvršena. Sada možete pokušati ponovo pristupiti stranici klijenata.");
    process.exit(0);
  })
  .catch(error => {
    console.error("Neočekivana greška:", error);
    process.exit(1);
  });