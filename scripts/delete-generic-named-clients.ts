import { db } from "../server/db";
import { sql } from "drizzle-orm";
import { clients } from "../shared/schema";

/**
 * Skripta za brisanje svih klijenata koji imaju generičko ime "Klijent X"
 * koje je dodato automatski prilikom popravke baze
 */
async function deleteGenericNamedClients() {
  try {
    console.log("Identifikujem klijente sa generičkim imenima...");
    
    // Pronađi klijente čije ime počinje sa "Klijent "
    const genericNamedClients = await db.select()
      .from(clients)
      .where(sql`${clients.fullName} LIKE 'Klijent %'`);
    
    console.log(`Pronađeno ${genericNamedClients.length} klijenata sa generičkim imenima.`);
    
    if (genericNamedClients.length > 0) {
      console.log("Primer klijenata sa generičkim imenima:");
      genericNamedClients.slice(0, 5).forEach(client => {
        console.log(`ID: ${client.id}, Ime: ${client.fullName}, Telefon: ${client.phone || "Nema"}`);
      });
      
      console.log(`\nBrišem ${genericNamedClients.length} klijenata...`);
      
      // Briši sve klijente sa generičkim imenima
      const result = await db.delete(clients)
        .where(sql`${clients.fullName} LIKE 'Klijent %'`);
      
      console.log("Brisanje završeno.");
      
      // Resetuj sekvencu ID-a
      console.log("Resetujem sekvencu ID-a...");
      await db.execute(sql`SELECT setval('clients_id_seq', (SELECT MAX(id) FROM clients), true)`);
      
      return { success: true, deleted: genericNamedClients.length };
    } else {
      console.log("Nema klijenata sa generičkim imenima za brisanje.");
      return { success: true, deleted: 0 };
    }
  } catch (error) {
    console.error("Greška pri brisanju klijenata:", error);
    return { success: false, error };
  }
}

// Pokreni skriptu
deleteGenericNamedClients()
  .then(result => {
    if (result.success) {
      console.log(`Uspešno obrisano ${result.deleted} klijenata sa generičkim imenima.`);
      
      // Prikaži broj preostalih klijenata
      return db.select({ count: sql`count(*)` }).from(clients).then(count => {
        console.log(`Preostalo ${count[0].count} klijenata u bazi.`);
        return result;
      });
    } else {
      console.error("Došlo je do greške pri brisanju klijenata.");
      return result;
    }
  })
  .then(() => {
    console.log("Sada možete pokušati ponovo pristupiti stranici klijenata.");
    process.exit(0);
  })
  .catch(error => {
    console.error("Neočekivana greška:", error);
    process.exit(1);
  });