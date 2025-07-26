import { db } from "../server/db";
import { sql } from "drizzle-orm";

/**
 * Skripta za ažuriranje šeme baze podataka
 * dodavanjem kolone phone u users tabelu ako ne postoji
 */
async function updatePhoneColumn() {
  try {
    console.log("Provera i dodavanje kolone phone u tabelu users...");
    
    // Provera da li već postoji
    const result = await db.execute(sql`
      SELECT 
        column_name 
      FROM 
        information_schema.columns 
      WHERE 
        table_name = 'users' AND 
        column_name = 'phone'
    `);
    
    if (result.rows.length === 0) {
      console.log("Kolona 'phone' ne postoji. Dodavanje...");
      
      // Dodavanje kolone phone ako ne postoji
      await db.execute(sql`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS phone TEXT
      `);
      
      console.log("✓ Kolona 'phone' je uspešno dodata u tabelu users.");
    } else {
      console.log("✓ Kolona 'phone' već postoji u tabeli users.");
    }
    
    // Ažuriranje ostalih kolona ako ne postoje
    await db.execute(sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS address TEXT,
      ADD COLUMN IF NOT EXISTS city TEXT,
      ADD COLUMN IF NOT EXISTS email TEXT
    `);
    
    console.log("✓ Sve potrebne kolone su dodate ili već postoje.");
    
  } catch (error) {
    console.error("Greška pri ažuriranju šeme baze:", error);
  }
}

// Pokretanje skripte
updatePhoneColumn().catch(console.error);