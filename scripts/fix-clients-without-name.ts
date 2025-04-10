import { db } from "../server/db";
import { sql, eq } from "drizzle-orm";
import { clients } from "../shared/schema";

async function fixClientsWithoutName() {
  try {
    console.log("Identifikujem klijente bez imena...");
    
    // Pronađi klijente bez imena
    const clientsWithoutName = await db.select()
      .from(clients)
      .where(sql`${clients.fullName} IS NULL OR ${clients.fullName} = ''`);
    
    console.log(`Pronađeno ${clientsWithoutName.length} klijenata bez imena.`);
    
    if (clientsWithoutName.length > 0) {
      console.log("Primer problematičnih klijenata:");
      clientsWithoutName.slice(0, 5).forEach(client => {
        console.log(`ID: ${client.id}, Telefon: ${client.phone || "Nema"}, Email: ${client.email || "Nema"}`);
      });
      
      console.log(`\nAžuriranje ${clientsWithoutName.length} klijenata...`);
      
      // Niz ažuriranja koje treba izvršiti
      const updatePromises = clientsWithoutName.map(client => {
        // Kreiraj generičko ime na osnovu ID-a
        const defaultName = `Klijent ${client.id}`;
        
        return db.update(clients)
          .set({ fullName: defaultName })
          .where(eq(clients.id, client.id));
      });
      
      // Izvrši sva ažuriranja
      await Promise.all(updatePromises);
      
      console.log("Ažuriranje završeno.");
      return { success: true, updated: clientsWithoutName.length };
    } else {
      console.log("Nema klijenata za ažuriranje.");
      return { success: true, updated: 0 };
    }
  } catch (error) {
    console.error("Greška pri ažuriranju klijenata:", error);
    return { success: false, error };
  }
}

// Pokreni skriptu
fixClientsWithoutName()
  .then(result => {
    if (result.success) {
      console.log(`Uspešno ažurirano ${result.updated} klijenata.`);
      console.log("Sada možete pokušati ponovo pristupiti stranici klijenata.");
    } else {
      console.error("Došlo je do greške pri ažuriranju klijenata.");
    }
    process.exit(0);
  })
  .catch(error => {
    console.error("Neočekivana greška:", error);
    process.exit(1);
  });