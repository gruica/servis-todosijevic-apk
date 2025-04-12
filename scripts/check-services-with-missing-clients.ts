/**
 * Jednostavna skripta koja će samo izlistati servise čiji klijenti ne postoje u bazi
 * i opciono ih obrisati
 */

import { db } from "../server/db";
import { services, clients } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

async function checkServicesWithMissingClients() {
  try {
    console.log("Početak provere servisa sa nepostojećim klijentima...");
    
    // Pronađi servise čiji klijenti ne postoje u tabeli clients
    const problematicServices = await db.select({
      id: services.id,
      status: services.status,
      clientId: services.clientId,
      description: services.description,
      createdAt: services.createdAt
    }).from(services)
    .where(
      sql`NOT EXISTS (SELECT 1 FROM ${clients} WHERE ${clients.id} = ${services.clientId})`
    );

    console.log(`Pronađeno ${problematicServices.length} servisa sa nepostojećim klijentima.`);
    
    if (problematicServices.length > 0) {
      console.log("\nLista problematičnih servisa:");
      problematicServices.forEach(service => {
        console.log(`- ID: ${service.id}, Klijent ID: ${service.clientId}, Status: ${service.status}, Datum: ${service.createdAt}`);
        console.log(`  Opis: ${service.description}`);
      });
      
      // Pitamo da li želite obrisati ove servise
      console.log("\nOvi servisi mogu izazvati problem bijelog ekrana na stranici servisa.");
      console.log("Za brisanje ovih servisa, dodajte parametar '--delete' prilikom pokretanja skripte.");
      
      // Proveravamo da li je prosleđen argument za brisanje
      const shouldDelete = process.argv.includes('--delete');
      
      if (shouldDelete) {
        console.log("\nBrisanje problematičnih servisa...");
        
        for (const service of problematicServices) {
          console.log(`Brisanje servisa ID: ${service.id}`);
          await db.delete(services).where(eq(services.id, service.id));
        }
        
        console.log(`\nUspešno obrisano ${problematicServices.length} problematičnih servisa.`);
      } else {
        console.log("\nServisi nisu obrisani. Za brisanje pokrenite skriptu sa '--delete' parametrom.");
      }
    } else {
      console.log("Dobro: Svi servisi imaju validne klijente u bazi.");
    }
    
    return {
      problematicServicesCount: problematicServices.length,
      deletedServicesCount: process.argv.includes('--delete') ? problematicServices.length : 0
    };
    
  } catch (error) {
    console.error("Greška prilikom provere servisa:", error);
    throw error;
  }
}

// Pokreni skriptu
checkServicesWithMissingClients()
  .then(result => {
    console.log("\nRezultat provere:");
    console.log(`- Ukupno problematičnih servisa: ${result.problematicServicesCount}`);
    console.log(`- Obrisano servisa: ${result.deletedServicesCount}`);
    process.exit(0);
  })
  .catch(error => {
    console.error("Neočekivana greška:", error);
    process.exit(1);
  });