import { db } from "../server/db";
import { sql } from "drizzle-orm";
import { clients } from "../shared/schema";

async function checkRemainingIssues() {
  try {
    // Proveri klijente bez telefonskih brojeva
    const clientsWithoutPhone = await db.select()
      .from(clients)
      .where(sql`${clients.phone} IS NULL OR ${clients.phone} = ''`);
    
    console.log(`Preostalo ${clientsWithoutPhone.length} klijenata bez telefona.`);
    
    // Proveri klijente bez imena
    const clientsWithoutName = await db.select()
      .from(clients)
      .where(sql`${clients.fullName} IS NULL OR ${clients.fullName} = ''`);
    
    console.log(`Preostalo ${clientsWithoutName.length} klijenata bez imena.`);
    
    // Prikaži ukupan broj klijenata
    const totalClients = await db.select({ count: sql`count(*)` }).from(clients);
    console.log(`Ukupan broj klijenata u bazi: ${totalClients[0].count}`);
    
  } catch (error) {
    console.error("Greška pri proveri:", error);
  }
}

// Pokreni proveru
checkRemainingIssues()
  .then(() => {
    console.log("Provera završena.");
    process.exit(0);
  })
  .catch(error => {
    console.error("Neočekivana greška:", error);
    process.exit(1);
  });