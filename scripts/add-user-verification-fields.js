/**
 * Skripta za dodavanje polja za verifikaciju korisnika u bazi podataka
 * Ovo će omogućiti administratorima da verifikuju nove korisnike pre nego što im se dozvoli pristup sistemu
 */

// Import the pool from server/db
import fs from 'fs';
import path from 'path';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { fileURLToPath } from 'url';
import ws from 'ws';

// Konfiguriši neon sa WebSocket konstruktorom
neonConfig.webSocketConstructor = ws;

// Dobijamo trenutni direktorijum
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Učitaj DATABASE_URL iz env datoteke ili proces env
const getDatabaseUrl = () => {
  // Prvo pokušaj iz procesa
  if (process.env.DATABASE_URL) {
    console.log('Konekcija na bazu sa DATABASE_URL iz process.env');
    return process.env.DATABASE_URL;
  }
  
  // Hardkodirana vrednost za DATABASE_URL ako nista drugo ne radi
  const defaultUrl = process.env.DATABASE_URL || process.env.PGDATABASE || 'postgresql://postgres:postgres@localhost:5432/postgres';
  console.log('Konekcija na bazu sa default URL:', defaultUrl);
  return defaultUrl;
};

// Kreiraj pool konekciju
const pool = new Pool({
  connectionString: getDatabaseUrl()
});

async function addUserVerificationFields() {
  console.log("Dodavanje polja za verifikaciju korisnika u bazu podataka...");
  
  try {
    // Prvo proveravamo da li polja već postoje
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'is_verified'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log("Polje 'is_verified' već postoji u tabeli users.");
      return;
    }
    
    // Dodajemo polja za verifikaciju
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN is_verified BOOLEAN DEFAULT FALSE NOT NULL,
      ADD COLUMN registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      ADD COLUMN verified_at TIMESTAMP,
      ADD COLUMN verified_by INTEGER
    `);
    
    console.log("Uspešno dodata polja za verifikaciju korisnika.");
    
    // Dodajemo indekse za brže upite
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_is_verified ON users (is_verified);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
    `);
    
    console.log("Uspešno dodati indeksi za nova polja.");
    
    // Postavljamo administratorske naloge kao verifikovane
    await pool.query(`
      UPDATE users 
      SET is_verified = TRUE, verified_at = CURRENT_TIMESTAMP 
      WHERE role = 'admin'
    `);
    
    console.log("Uspešno ažurirani postojeći administratorski nalozi.");
    
    // Postavljamo tehničare (servisere) kao verifikovane
    await pool.query(`
      UPDATE users 
      SET is_verified = TRUE, verified_at = CURRENT_TIMESTAMP 
      WHERE role = 'technician'
    `);
    
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