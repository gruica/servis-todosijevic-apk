import { db } from "../server/db";
import { sql } from "drizzle-orm";
import { clients } from "../shared/schema";

/**
 * Skripta za brisanje svih klijenata bez imena ili broja telefona
 */
async function deleteClientsWithoutData() {
  try {
    console.log("Identifikujem klijente bez imena ili broja telefona...");
    
    // Pronađi klijente bez imena ILI bez broja telefona
    const problematicClients = await db.select()
      .from(clients)
      .where(
        sql`${clients.fullName} IS NULL OR 
            ${clients.fullName} = '' OR 
            ${clients.phone} IS NULL OR 
            ${clients.phone} = ''`
      );
    
    console.log(`Pronađeno ${problematicClients.length} problematičnih klijenata.`);
    
    if (problematicClients.length > 0) {
      console.log("Primer problematičnih klijenata:");
      problematicClients.slice(0, 5).forEach(client => {
        console.log(`ID: ${client.id}, Ime: ${client.fullName || "Nepoznato"}, Telefon: ${client.phone || "Nema"}`);
      });
      
      console.log(`\nBrišem ${problematicClients.length} klijenata...`);
      
      // Briši sve problematične klijente
      const result = await db.delete(clients)
        .where(
          sql`${clients.fullName} IS NULL OR 
              ${clients.fullName} = '' OR 
              ${clients.phone} IS NULL OR 
              ${clients.phone} = ''`
        );
      
      console.log("Brisanje završeno.");
      
      // Resetuj sekvencu ID-a
      console.log("Resetujem sekvencu ID-a...");
      await db.execute(sql`SELECT setval('clients_id_seq', (SELECT MAX(id) FROM clients), true)`);
      
      return { success: true, deleted: problematicClients.length };
    } else {
      console.log("Nema problematičnih klijenata za brisanje.");
      return { success: true, deleted: 0 };
    }
  } catch (error) {
    console.error("Greška pri brisanju klijenata:", error);
    return { success: false, error };
  }
}

// Pokreni skriptu
deleteClientsWithoutData()
  .then(result => {
    if (result.success) {
      console.log(`Uspešno obrisano ${result.deleted} problematičnih klijenata.`);
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