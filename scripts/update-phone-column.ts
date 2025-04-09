import { db, pool } from "../server/db";
import { sql } from "drizzle-orm";

/**
 * Skripta za ažuriranje šeme baze podataka
 * dodavanjem kolone phone u users tabelu ako ne postoji
 */
async function updatePhoneColumn() {
  try {
    console.log("Provera i dodavanje kolone phone u tabelu users...");
    
    // Provera da li već postoji
    const checkColumnQuery = `
      SELECT 
        column_name 
      FROM 
        information_schema.columns 
      WHERE 
        table_name = 'users' AND 
        column_name = 'phone'
    `;
    
    const result = await pool.query(checkColumnQuery);
    
    if (result.rows.length === 0) {
      console.log("Kolona 'phone' ne postoji. Dodavanje...");
      
      // Dodavanje kolone phone ako ne postoji
      await pool.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS phone TEXT
      `);
      
      console.log("✓ Kolona 'phone' je uspešno dodata u tabelu users.");
    } else {
      console.log("✓ Kolona 'phone' već postoji u tabeli users.");
    }
    
    // Ažuriranje ostalih kolona ako ne postoje
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS address TEXT,
      ADD COLUMN IF NOT EXISTS city TEXT,
      ADD COLUMN IF NOT EXISTS email TEXT
    `);
    
    console.log("✓ Sve potrebne kolone su dodate ili već postoje.");
    
  } catch (error) {
    console.error("Greška pri ažuriranju šeme baze:", error);
  } finally {
    await pool.end();
  }
}

// Pokretanje skripte
updatePhoneColumn().catch(console.error);