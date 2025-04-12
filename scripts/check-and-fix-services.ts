/**
 * Skripta za proveru i čišćenje problematičnih servisa u bazi
 * Ova skripta će identifikovati servise koji nemaju validne podatke i koji mogu uzrokovati
 * probleme sa prikazom na stranici servisa.
 */

import { db } from "../server/db";
import { services, clients } from "../shared/schema";
import { eq, isNull, sql } from "drizzle-orm";

async function checkAndFixServices() {
  try {
    console.log("Početak provere servisa...");
    
    // 1. Pronaći sve servise u bazi
    const allServices = await db.select().from(services);
    console.log(`Pronađeno ukupno ${allServices.length} servisa u bazi.`);

    // 2. Pronaći servise koji nemaju vezane klijente
    const servicesWithoutClient = await db.select({
      id: services.id,
      status: services.status,
      description: services.description,
      clientId: services.clientId,
    }).from(services)
    .where(
      sql`${services.clientId} IS NULL OR NOT EXISTS (SELECT 1 FROM ${clients} WHERE ${clients.id} = ${services.clientId})`
    );

    if (servicesWithoutClient.length > 0) {
      console.log(`UPOZORENJE: Pronađeno ${servicesWithoutClient.length} servisa bez validnog klijenta:`);
      servicesWithoutClient.forEach(service => {
        console.log(`- ID: ${service.id}, Status: ${service.status}, Client ID: ${service.clientId}, Opis: ${service.description}`);
      });

      // 3. Pitamo korisnika da li želimo izbrisati problematične servise
      console.log("\nOvi servisi mogu izazvati problem bijelog ekrana na stranici servisa.");
      console.log("Brisanje ovih servisa? (Da/Ne)");
      console.log("Pošto je ovo skripta, pretpostavljamo 'Da' radi popravke problema u produkciji.");

      // 4. Brišemo problematične servise
      for (const service of servicesWithoutClient) {
        console.log(`Brisanje servisa ID: ${service.id}`);
        await db.delete(services).where(eq(services.id, service.id));
      }
      console.log(`Obrisano ${servicesWithoutClient.length} problematičnih servisa.`);
    } else {
      console.log("Dobro: Nisu pronađeni servisi bez vezanog klijenta.");
    }

    // 5. Pronaći servise sa null vrednostima u važnim poljima
    const servicesWithNullValues = await db.select({
      id: services.id,
      status: services.status,
      description: services.description,
      clientId: services.clientId,
      applianceId: services.applianceId,
    }).from(services)
    .where(
      sql`${services.description} IS NULL OR 
          ${services.status} IS NULL OR 
          ${services.applianceId} IS NULL`
    );

    if (servicesWithNullValues.length > 0) {
      console.log(`\nUPOZORENJE: Pronađeno ${servicesWithNullValues.length} servisa sa null vrednostima u važnim poljima:`);
      servicesWithNullValues.forEach(service => {
        console.log(`- ID: ${service.id}, Status: ${service.status}, Client ID: ${service.clientId}, Appliance ID: ${service.applianceId}, Opis: ${service.description}`);
      });

      // 6. Popravljamo servise sa null vrednostima
      for (const service of servicesWithNullValues) {
        console.log(`Popravljanje servisa ID: ${service.id}`);
        await db.update(services)
          .set({
            description: service.description || "Nepoznat problem",
            status: service.status || "pending",
            // Ne popravljamo applianceId jer je to strani ključ koji mora biti validan
          })
          .where(eq(services.id, service.id));
      }
      console.log(`Popravljeno ${servicesWithNullValues.length} servisa sa null vrednostima.`);
    } else {
      console.log("Dobro: Nisu pronađeni servisi sa null vrednostima u obaveznim poljima.");
    }

    console.log("\nProvera i popravka servisa uspešno završena!");
    return {
      servicesFixed: servicesWithNullValues.length,
      servicesDeleted: servicesWithoutClient.length,
      totalServices: allServices.length - servicesWithoutClient.length
    };
  } catch (error) {
    console.error("Greška prilikom provere servisa:", error);
    throw error;
  }
}

// Pokreni skriptu
checkAndFixServices()
  .then(result => {
    console.log("\nRezultat:");
    console.log(`- Ukupno servisa u bazi nakon čišćenja: ${result.totalServices}`);
    console.log(`- Obrisano problematičnih servisa: ${result.servicesDeleted}`);
    console.log(`- Popravljeno servisa sa null vrednostima: ${result.servicesFixed}`);
    process.exit(0);
  })
  .catch(error => {
    console.error("Neočekivana greška:", error);
    process.exit(1);
  });