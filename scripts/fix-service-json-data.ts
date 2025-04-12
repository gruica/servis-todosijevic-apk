/**
 * Skripta za popravku servisa sa nevalidnim JSON podacima u polju used_parts
 * Ova skripta će automatski popraviti sve servise identifikovane kao problematične
 * tako što će nevalidan JSON pretvoriti u validne prazne nizove []
 */
import { pool } from "../server/db";

async function fixServiceJsonData() {
  try {
    console.log("Započinjem popravku servisa sa nevalidnim JSON podacima...");
    
    // Problem je u polju used_parts koje bi trebalo biti JSON, ali sadrži nevalidne vrednosti
    // Prvo dohvatimo sve servise
    const servicesResult = await pool.query(`
      SELECT id, used_parts 
      FROM services
      ORDER BY id DESC
    `);
    
    const services = servicesResult.rows;
    console.log(`Pronađeno ukupno ${services.length} servisa za analizu.\n`);
    
    let problematicServices = [];
    let fixedServices = [];
    
    // Identifikujemo problematične servise
    for (const service of services) {
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
      let convertedValue;
      
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
      const updateResult = await pool.query(`
        UPDATE services
        SET used_parts = $1
        WHERE id = $2
        RETURNING id
      `, [convertedValue, service.id]);
      
      if (updateResult.rowCount > 0) {
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
    const checkResult = await pool.query(`
      SELECT id, used_parts 
      FROM services
      ORDER BY id DESC
    `);
    
    let remainingProblems = 0;
    
    for (const service of checkResult.rows) {
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
  } finally {
    await pool.end();
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