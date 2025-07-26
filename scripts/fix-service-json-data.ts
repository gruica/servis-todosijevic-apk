/**
 * Skripta za popravku servisa sa nevalidnim JSON podacima u polju used_parts
 * Ova skripta će automatski popraviti sve servise identifikovane kao problematične
 * tako što će nevalidan JSON pretvoriti u validne prazne nizove []
 */
import { db } from "../server/db";
import { services } from "../shared/schema";
import { sql, eq } from "drizzle-orm";

interface ProblematicService {
  id: number;
  used_parts: string;
}

interface FixedService {
  id: number;
  old_value: string;
  new_value: string;
}

async function fixServiceJsonData() {
  try {
    console.log("Započinjem popravku servisa sa nevalidnim JSON podacima...");
    
    // Problem je u polju used_parts koje bi trebalo biti JSON, ali sadrži nevalidne vrednosti
    // Prvo dohvatimo sve servise
    const servicesResult = await db
      .select({ id: services.id, used_parts: services.usedParts })
      .from(services)
      .orderBy(sql`${services.id} DESC`);
    
    const servicesData = servicesResult;
    console.log(`Pronađeno ukupno ${servicesData.length} servisa za analizu.\n`);
    
    const problematicServices: ProblematicService[] = [];
    const fixedServices: FixedService[] = [];
    
    // Identifikujemo problematične servise
    for (const service of servicesData) {
      // Ako je used_parts prazan, preskočimo
      if (!service.used_parts) continue;
      
      // Pokušaj parsiranja JSON-a
      try {
        JSON.parse(service.used_parts);
      } catch (e) {
        problematicServices.push({
          id: service.id,
          used_parts: service.used_parts
        });
      }
    }
    
    console.log(`Pronađeno ${problematicServices.length} servisa sa nevalidnim JSON podacima.`);
    
    // Popravka problematičnih servisa
    for (const service of problematicServices) {
      console.log(`Popravljam servis ID: ${service.id} (used_parts: "${service.used_parts}")`);
      
      // Konvertujemo string vrednost u validni JSON
      let convertedValue: string;
      
      // Logika za konverziju:
      // Ako vrednost izgleda kao koristan tekst, stavljamo ga u niz kao string
      // U suprotnom, stavljamo prazan niz
      if (service.used_parts && 
          !['', '-', '.', 'null', 'undefined'].includes(service.used_parts.trim())) {
        convertedValue = JSON.stringify([service.used_parts]);
      } else {
        convertedValue = '[]';
      }
      
      // Ažuriramo vrednost u bazi
      const updateResult = await db
        .update(services)
        .set({ usedParts: convertedValue })
        .where(eq(services.id, service.id))
        .returning({ id: services.id });
      
      if (updateResult.length > 0) {
        fixedServices.push({
          id: service.id,
          old_value: service.used_parts,
          new_value: convertedValue
        });
      }
    }
    
    console.log(`\nUspješno popravljeno ${fixedServices.length} od ${problematicServices.length} servisa.`);
    console.log("\nDetalji popravljenih servisa:");
    console.log("==============================");
    
    fixedServices.forEach((service, index) => {
      console.log(`${index + 1}. Servis ID: ${service.id}`);
      console.log(`   Stara vrijednost: "${service.old_value}"`);
      console.log(`   Nova vrijednost: ${service.new_value}`);
      console.log("------------------------------");
    });
    
    // Provjera da li još ima problematičnih servisa
    const checkResult = await db
      .select({ id: services.id, used_parts: services.usedParts })
      .from(services)
      .orderBy(sql`${services.id} DESC`);
    
    let remainingProblems = 0;
    
    for (const service of checkResult) {
      if (!service.used_parts) continue;
      
      try {
        JSON.parse(service.used_parts);
      } catch (e) {
        remainingProblems++;
        console.log(`UPOZORENJE: Servis ID ${service.id} još uvijek ima nevalidan JSON: "${service.used_parts}"`);
      }
    }
    
    if (remainingProblems === 0) {
      console.log("\n✅ Svi servisi su uspješno popravljeni!");
    } else {
      console.log(`\n⚠️ Još uvijek ima ${remainingProblems} servisa sa problemom.`);
    }
    
  } catch (error) {
    console.error("Greška prilikom popravke servisa:", error);
  }
}

// Pokreni funkciju
fixServiceJsonData().then(() => {
  console.log("\nGotovo.");
  process.exit(0);
}).catch(error => {
  console.error("Kritična greška:", error);
  process.exit(1);
});