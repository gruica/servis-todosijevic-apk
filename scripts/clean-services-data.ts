/**
 * Skripta za čišćenje podataka u servisi tabeli
 * Proverava i popravlja servise sa potencijalno problematičnim podacima
 */

import { db } from "../server/db";
import { services } from "../shared/schema";
import { eq, isNull, sql } from "drizzle-orm";

async function cleanServicesData() {
  try {
    console.log("Započinjem proces čišćenja podataka servisa...");
    
    // 1. Dohvati sve servise iz baze
    const allServices = await db.select().from(services);
    console.log(`Ukupno servisa u bazi: ${allServices.length}`);
    
    let fixedCount = 0;
    
    // 2. Proveri i popravi problematične servise
    for (const service of allServices) {
      let needsUpdate = false;
      const updates: any = {};
      
      // Provera polja description
      if (!service.description) {
        updates.description = "Nepoznat problem";
        needsUpdate = true;
      }
      
      // Provera status polja
      if (!service.status) {
        updates.status = "pending";
        needsUpdate = true;
      }
      
      // Provera applianceId (mora postojati jer je strani ključ)
      if (!service.applianceId) {
        console.log(`UPOZORENJE: Servis ID ${service.id} nema definisan uređaj (applianceId).`);
        console.log(`  Ovaj servis će biti zanemaren jer uređaj je obavezan.`);
        continue;
      }
      
      // Ažuriraj servis ako su potrebne promene
      if (needsUpdate) {
        console.log(`Popravljanje servisa ID: ${service.id}`);
        await db.update(services)
          .set(updates)
          .where(eq(services.id, service.id));
        fixedCount++;
      }
    }
    
    console.log(`\nUspešno popravljeno ${fixedCount} servisa sa nevalidnim podacima.`);
    
    // 3. Proveri servise sa potencijalno problematičnim description poljem
    const servicesWithLongDesc = await db.select({
      id: services.id,
      description: services.description
    }).from(services)
    .where(
      sql`length(${services.description}) > 2000 OR ${services.description} LIKE '%<%' OR ${services.description} LIKE '%>%'`
    );
    
    if (servicesWithLongDesc.length > 0) {
      console.log(`\nPronađeno ${servicesWithLongDesc.length} servisa sa potencijalno problematičnim opisom:`);
      
      for (const service of servicesWithLongDesc) {
        console.log(`- Servis ID: ${service.id}, Dužina opisa: ${service.description?.length || 0}`);
        
        // Skrati opis ako je predugačak
        if (service.description && service.description.length > 2000) {
          const trimmedDesc = service.description.substring(0, 2000) + "...";
          await db.update(services)
            .set({ description: trimmedDesc })
            .where(eq(services.id, service.id));
          console.log(`  Skraćen opis servisa ID: ${service.id}`);
        }
        
        // Ukloni HTML tagove ako postoje
        if (service.description && (service.description.includes('<') || service.description.includes('>'))) {
          const cleanDesc = service.description.replace(/<[^>]*>/g, '');
          await db.update(services)
            .set({ description: cleanDesc })
            .where(eq(services.id, service.id));
          console.log(`  Uklonjeni HTML tagovi iz opisa servisa ID: ${service.id}`);
        }
      }
    } else {
      console.log("Dobro: Nisu pronađeni servisi sa problematičnim opisima.");
    }
    
    console.log("\nČišćenje podataka servisa uspešno završeno!");
    
    return {
      totalServices: allServices.length,
      fixedServices: fixedCount,
      cleanedDescriptions: servicesWithLongDesc.length
    };
  } catch (error) {
    console.error("Greška prilikom čišćenja podataka servisa:", error);
    throw error;
  }
}

// Pokreni skriptu
cleanServicesData()
  .then(result => {
    console.log("\nRezultat čišćenja:");
    console.log(`- Ukupno servisa: ${result.totalServices}`);
    console.log(`- Popravljeno servisa: ${result.fixedServices}`);
    console.log(`- Očišćeno problematičnih opisa: ${result.cleanedDescriptions}`);
    process.exit(0);
  })
  .catch(error => {
    console.error("Neočekivana greška:", error);
    process.exit(1);
  });