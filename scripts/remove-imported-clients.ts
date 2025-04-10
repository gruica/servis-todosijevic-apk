import { db } from "../server/db";
import { eq, sql } from "drizzle-orm";
import { clients } from "../shared/schema";

/**
 * Ova skripta će identifikovati i ukloniti klijente koji su verovatno uvezeni iz Excel tabele
 * i uzrokuju probleme sa prikazom.
 * 
 * Criteria za identifikaciju:
 * 1. Klijenti koji nemaju telefonske brojeve (phone = null)
 * 2. Opciono: Klijenti čiji ID-evi su iznad određenog broja (ako je poznato da su uvezeni klijenti dodati kasnije)
 */
async function removeImportedClients() {
  try {
    console.log("Identifikujem problematične klijente...");
    
    // 1. Identifikuj klijente bez telefonskih brojeva
    const clientsWithoutPhone = await db.select()
      .from(clients)
      .where(sql`${clients.phone} IS NULL OR ${clients.phone} = ''`);
    
    console.log(`Pronađeno ${clientsWithoutPhone.length} klijenata bez telefonskog broja.`);
    
    // Prikaži neke informacije o tim klijentima
    if (clientsWithoutPhone.length > 0) {
      console.log("Primer problematičnih klijenata:");
      clientsWithoutPhone.slice(0, 5).forEach(client => {
        console.log(`ID: ${client.id}, Ime: ${client.fullName || "Nepoznato"}, Email: ${client.email || "Nema"}`);
      });
      
      // Pitaj za potvrdu pre brisanja (samo u konzoli - moramo obrisati)
      console.log(`\nBrisanje ${clientsWithoutPhone.length} klijenata...`);
      
      // Briši klijente bez telefonskog broja
      const result = await db.delete(clients)
        .where(sql`${clients.phone} IS NULL OR ${clients.phone} = ''`);
      
      console.log(`Brisanje završeno.`);
      
      // Recalculate sequence (if needed)
      console.log("Resetujem sekvencu ID-a...");
      await db.execute(sql`SELECT setval('clients_id_seq', (SELECT MAX(id) FROM clients), true)`);
      console.log("Sekvenca resetovana.");
      
      return { success: true, removed: clientsWithoutPhone.length };
    } else {
      console.log("Nisu pronađeni problematični klijenti za brisanje.");
      return { success: true, removed: 0 };
    }
  } catch (error) {
    console.error("Greška pri brisanju klijenata:", error);
    return { success: false, error };
  }
}

// Izvrši skriptu
removeImportedClients()
  .then(result => {
    if (result.success) {
      console.log(`Uspešno uklonjeno ${result.removed} problematičnih klijenata.`);
      console.log("Sada možete pokušati ponovo pristupiti stranici klijenata.");
    } else {
      console.error("Došlo je do greške pri brisanju klijenata.");
    }
    process.exit(0);
  })
  .catch(error => {
    console.error("Neočekivana greška:", error);
    process.exit(1);
  });