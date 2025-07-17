/**
 * Skripta za dodavanje polja za verifikaciju korisnika u bazi podataka
 * Ovo će omogućiti administratorima da verifikuju nove korisnike pre nego što im se dozvoli pristup sistemu
 */

import { pool } from "../server/db";
import { sql } from "drizzle-orm";

async function addUserVerificationFields() {
  console.log("Dodavanje polja za verifikaciju korisnika u bazu podataka...");
  
  try {
    // Prvo proveravamo da li polja već postoje
    const checkResult = await pool.query(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'is_verified'
    `.query);
    
    if (checkResult.rows.length > 0) {
      console.log("Polje 'is_verified' već postoji u tabeli users.");
      return;
    }
    
    // Dodajemo polja za verifikaciju
    await pool.query(sql`
      ALTER TABLE users 
      ADD COLUMN is_verified BOOLEAN DEFAULT FALSE NOT NULL,
      ADD COLUMN registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      ADD COLUMN verified_at TIMESTAMP,
      ADD COLUMN verified_by INTEGER
    `.query);
    
    console.log("Uspešno dodata polja za verifikaciju korisnika.");
    
    // Dodajemo indekse za brže upite
    await pool.query(sql`
      CREATE INDEX idx_users_is_verified ON users (is_verified);
      CREATE INDEX idx_users_email ON users (email);
    `.query);
    
    console.log("Uspešno dodati indeksi za nova polja.");
    
    // Postavljamo administratorske naloge kao verifikovane
    await pool.query(sql`
      UPDATE users 
      SET is_verified = TRUE, verified_at = CURRENT_TIMESTAMP 
      WHERE role = 'admin'
    `.query);
    
    console.log("Uspešno ažurirani postojeći administratorski nalozi.");
    
    // Postavljamo tehničare (servisere) kao verifikovane
    await pool.query(sql`
      UPDATE users 
      SET is_verified = TRUE, verified_at = CURRENT_TIMESTAMP 
      WHERE role = 'technician'
    `.query);
    
    console.log("Uspešno ažurirani postojeći nalozi servisera.");
    
    console.log("Migracija završena uspešno!");
  } catch (error) {
    console.error("Greška prilikom dodavanja polja za verifikaciju:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Pozivamo glavnu funkciju
addUserVerificationFields().catch(error => {
  console.error("Neočekivana greška:", error);
  process.exit(1);
});