/**
 * Skripta za resetovanje lozinki poslovnih partnera na standardnu vrednost
 */
import { db } from "../server/db";
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
    
    // Standardna lozinka za poslovne partnere
    const standardPassword = "partner123";
    
    // Dohvati sve korisnike sa ulogom "business"
    const businessPartners = await db.query.users.findMany({
      where: (users, { eq }) => eq(users.role, "business"),
      columns: {
        id: true,
        username: true,
        fullName: true,
        companyName: true
      }
    });
    
    console.log(`Pronađeno ${businessPartners.length} poslovnih partnera.\n`);
    
    if (businessPartners.length === 0) {
      console.log("Nema poslovnih partnera u bazi.");
      return;
    }
    
    // Resetovanje lozinke za svakog poslovnog partnera
    for (const partner of businessPartners) {
      const hashedPassword = await hashPassword(standardPassword);
      
      // Direktan SQL upit za ažuriranje lozinke - koristimo numerisane parametre
      await db.execute(
        `UPDATE users SET password = $1 WHERE id = ${partner.id}`,
        [hashedPassword]
      );
      
      console.log(`Resetovana lozinka za partnera: ${partner.fullName} (${partner.companyName || 'bez firme'})`);
    }
    
    console.log("\nLozinke uspešno resetovane za sve poslovne partnere.");
    console.log(`Nova lozinka za sve poslovne partnere je: ${standardPassword}`);
    
  } catch (error) {
    console.error("Greška pri resetovanju lozinki:", error);
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