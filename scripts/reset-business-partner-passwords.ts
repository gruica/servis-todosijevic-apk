/**
 * Skripta za resetovanje lozinki poslovnih partnera na standardnu vrednost
 */
import { pool } from "../server/db";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function resetBusinessPartnerPasswords() {
  try {
    console.log("Dohvatanje poslovnih partnera...");
    
    // Standardna lozinka za poslovne partnere iz environment varijable
    const standardPassword = process.env.BUSINESS_PARTNER_DEFAULT_PASSWORD;
    
    if (!standardPassword) {
      console.error("❌ BUSINESS_PARTNER_DEFAULT_PASSWORD environment variable is required");
      return;
    }
    
    // Dohvati sve korisnike sa ulogom "business"
    const businessPartnersResult = await pool.query(`
      SELECT id, username, full_name, company_name 
      FROM users 
      WHERE role = 'business'
    `);
    
    const businessPartners = businessPartnersResult.rows;
    
    console.log(`Pronađeno ${businessPartners.length} poslovnih partnera.\n`);
    
    if (businessPartners.length === 0) {
      console.log("Nema poslovnih partnera u bazi.");
      return;
    }
    
    // Resetovanje lozinke za svakog poslovnog partnera
    for (const partner of businessPartners) {
      const hashedPassword = await hashPassword(standardPassword);
      
      // Direktan SQL upit za ažuriranje lozinke
      await pool.query(`
        UPDATE users
        SET password = $1
        WHERE id = $2
      `, [hashedPassword, partner.id]);
      
      console.log(`Resetovana lozinka za partnera: ${partner.full_name} (${partner.company_name || 'bez firme'})`);
    }
    
    console.log("\nLozinke uspešno resetovane za sve poslovne partnere.");
    console.log("Nova lozinka je postavljena iz environment varijable.");
    
  } catch (error) {
    console.error("Greška pri resetovanju lozinki:", error);
  } finally {
    await pool.end();
  }
}

// Pokreni funkciju
resetBusinessPartnerPasswords().then(() => {
  console.log("Gotovo.");
  process.exit(0);
}).catch(error => {
  console.error("Greška:", error);
  process.exit(1);
});