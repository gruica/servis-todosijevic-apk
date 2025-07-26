/**
 * Skripta za resetovanje lozinki poslovnih partnera na standardnu vrednost
 */
import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
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
    const businessPartners = await db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        companyName: users.companyName
      })
      .from(users)
      .where(eq(users.role, 'business'));
    
    console.log(`Pronađeno ${businessPartners.length} poslovnih partnera.\n`);
    
    if (businessPartners.length === 0) {
      console.log("Nema poslovnih partnera u bazi.");
      return;
    }
    
    // Resetovanje lozinke za svakog poslovnog partnera
    for (const partner of businessPartners) {
      const hashedPassword = await hashPassword(standardPassword);
      
      // Ažuriranje lozinke koristeći Drizzle query builder
      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, partner.id));
      
      console.log(`Resetovana lozinka za partnera: ${partner.fullName} (${partner.companyName || 'bez firme'})`);
    }
    
    console.log("\nLozinke uspešno resetovane za sve poslovne partnere.");
    console.log("Nova lozinka je postavljena iz environment varijable.");
    
  } catch (error) {
    console.error("Greška pri resetovanju lozinki:", error);
  } finally {
    // Drizzle connection will be automatically managed
    console.log("Konekcija sa bazom zatvorena.");
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