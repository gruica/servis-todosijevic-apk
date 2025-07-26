/**
 * Skripta za resetovanje lozinki servisera na standardnu vrednost
 */
import { db } from "../server/db";
import { sql, eq } from "drizzle-orm";
import { users, technicians } from "../shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function resetTechnicianPasswords() {
  try {
    console.log("Dohvatanje servisera...");
    
    // Standardna lozinka za servisere - učitava se iz environment varijable
    const standardPassword = process.env.TECHNICIAN_DEFAULT_PASSWORD;
    
    if (!standardPassword) {
      console.error("GREŠKA: Environment varijabla TECHNICIAN_DEFAULT_PASSWORD nije postavljena.");
      console.error("Molimo postavite lozinku kroz Replit Secrets sistem.");
      return;
    }
    
    // 1. Dohvati korisnike koji su povezani sa serviserima (koji imaju technician_id)
    const technicianUsers = await db
      .select({
        id: users.id,
        username: users.username,
        full_name: users.fullName,
        technician_name: technicians.fullName,
        specialization: technicians.specialization
      })
      .from(users)
      .innerJoin(technicians, eq(users.technicianId, technicians.id))
      .where(eq(users.role, 'technician'));
    
    console.log(`Pronađeno ${technicianUsers.length} korisničkih naloga za servisere.\n`);
    
    if (technicianUsers.length === 0) {
      console.log("Nema korisničkih naloga za servisere u bazi.");
      return;
    }
    
    // Resetovanje lozinke za svakog servisera
    for (const user of technicianUsers) {
      const hashedPassword = await hashPassword(standardPassword);
      
      // Direktan SQL upit za ažuriranje lozinke
      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, user.id));
      
      console.log(`Resetovana lozinka za servisera: ${user.full_name} (${user.specialization || 'bez specijalizacije'})`);
    }
    
    console.log("\nLozinke uspešno resetovane za sve servisere.");
    console.log("Nova lozinka je postavljena iz TECHNICIAN_DEFAULT_PASSWORD environment varijable.");
    
  } catch (error) {
    console.error("Greška pri resetovanju lozinki:", error);
  } finally {
    // Drizzle handles connection pooling automatically
    console.log("Konekcija završena.");
  }
}

// Pokreni funkciju
resetTechnicianPasswords().then(() => {
  console.log("Gotovo.");
  process.exit(0);
}).catch(error => {
  console.error("Greška:", error);
  process.exit(1);
});