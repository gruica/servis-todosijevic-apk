/**
 * Skripta za čišćenje i popravljanje problematičnih podataka u aplikaciji
 * 1. Popravlja nevalidan JSON u used_parts polju
 * 2. Čisti čudne opise servisa
 * 3. Validira email adrese klijenata
 */

import { pool } from "../server/db";

async function fixJsonDataAndCleanup() {
  try {
    console.log("Početak čišćenja podataka...\n");

    // 1. Popravi nevalidan JSON u used_parts
    console.log("1. Popravljanje nevalidnog JSON-a u used_parts...");
    
    const servicesWithInvalidJson = await pool.query(`
      SELECT id, used_parts 
      FROM services 
      WHERE used_parts IS NOT NULL 
        AND used_parts != '' 
        AND used_parts != '[]'
        AND (
          used_parts LIKE '[]%' 
          OR (used_parts NOT LIKE '[%' AND used_parts NOT LIKE '"%')
        )
    `);

    console.log(`Pronađeno ${servicesWithInvalidJson.rows.length} servisa sa nevalidnim JSON podacima`);

    for (const service of servicesWithInvalidJson.rows) {
      let fixedParts = '[]';
      
      // Ako počinje sa [], ukloni to i stavi ostatak u array
      if (service.used_parts.startsWith('[]')) {
        const remainingText = service.used_parts.substring(2).trim();
        if (remainingText) {
          fixedParts = JSON.stringify([remainingText]);
        }
      } else {
        // Ako nije validni JSON, stavi ceo string u array
        fixedParts = JSON.stringify([service.used_parts]);
      }

      await pool.query(
        'UPDATE services SET used_parts = $1 WHERE id = $2',
        [fixedParts, service.id]
      );

      console.log(`Servis ${service.id}: "${service.used_parts}" → "${fixedParts}"`);
    }

    // 2. Identifikuj servise sa čudnim opisima
    console.log("\n2. Identifikovanje servisa sa problematičnim opisima...");
    
    const servicesWithWeirdDescriptions = await pool.query(`
      SELECT id, description, client_id, status, created_at
      FROM services 
      WHERE length(description) > 200
        OR description ~ '^[a-zA-Z]{20,}$'
      ORDER BY id DESC
    `);

    console.log(`Pronađeno ${servicesWithWeirdDescriptions.rows.length} servisa sa čudnim opisima:`);
    
    for (const service of servicesWithWeirdDescriptions.rows) {
      console.log(`Servis ${service.id}: "${service.description}" (${service.description.length} karaktera)`);
    }

    // 3. Proveri email adrese klijenata
    console.log("\n3. Proveravanje email adresa klijenata...");
    
    const clientsWithInvalidEmails = await pool.query(`
      SELECT id, full_name, email, phone
      FROM clients 
      WHERE email IS NOT NULL 
        AND email != '' 
        AND email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    `);

    console.log(`Pronađeno ${clientsWithInvalidEmails.rows.length} klijenata sa nevalidnim email adresama:`);
    
    for (const client of clientsWithInvalidEmails.rows) {
      console.log(`Klijent ${client.id} (${client.full_name}): "${client.email}"`);
    }

    // 4. Proveri performanse servisa
    console.log("\n4. Analiza performansi servisa...");
    
    const serviceStats = await pool.query(`
      SELECT 
        COUNT(*) as ukupno_servisa,
        COUNT(DISTINCT client_id) as broj_klijenata,
        COUNT(DISTINCT appliance_id) as broj_uredjaja,
        COUNT(CASE WHEN technician_id IS NOT NULL THEN 1 END) as dodeljeno_tehnicarima,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as na_cekanju,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as zavrseno
      FROM services
    `);

    console.log("Statistike servisa:", serviceStats.rows[0]);

    // 5. Analiza korišćenih delova
    console.log("\n5. Analiza korišćenih delova...");
    
    const partsAnalysis = await pool.query(`
      SELECT 
        COUNT(*) as ukupno_servisa,
        COUNT(CASE WHEN used_parts IS NULL OR used_parts = '' OR used_parts = '[]' THEN 1 END) as bez_delova,
        COUNT(CASE WHEN used_parts IS NOT NULL AND used_parts != '' AND used_parts != '[]' THEN 1 END) as sa_delovima
      FROM services
    `);

    console.log("Analiza delova:", partsAnalysis.rows[0]);

    console.log("\nČišćenje podataka završeno!");

  } catch (error) {
    console.error("Greška prilikom čišćenja podataka:", error);
  }
}

// Pokretanje skripte
fixJsonDataAndCleanup().then(() => {
  console.log("Skripta završena.");
  process.exit(0);
}).catch(error => {
  console.error("Greška:", error);
  process.exit(1);
});