import { db } from "../server/db";
import { users } from "../shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function resetAllPasswords() {
  try {
    console.log("Resetovanje svih lozinki...");
    
    // Get reset passwords from environment variables
    const adminPassword = process.env.ADMIN_RESET_PASSWORD;
    const techPassword = process.env.TECH_RESET_PASSWORD;
    
    if (!adminPassword || !techPassword) {
      console.error("GREŠKA: Nedostaju potrebne environment varijable:");
      console.error("- ADMIN_RESET_PASSWORD: lozinka za resetovanje admin naloga");
      console.error("- TECH_RESET_PASSWORD: lozinka za resetovanje tehničar naloga");
      process.exit(1);
    }
    
    // Dohvati sve korisnike
    const allUsers = await db.select().from(users);
    console.log(`Pronađeno ${allUsers.length} korisnika za resetovanje lozinki`);
    
    // Reset administratorskih lozinki
    for (const user of allUsers.filter(u => u.role === "admin")) {
      const hashedPassword = await hashPassword(adminPassword);
      
      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, user.id));
      
      console.log(`Resetovana lozinka za administratora: ${user.username}`);
    }
    
    // Reset za servisere (techničare)
    for (const user of allUsers.filter(u => u.role === "technician")) {
      const hashedPassword = await hashPassword(techPassword);
      
      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, user.id));
      
      console.log(`Resetovana lozinka za servisera: ${user.username}`);
    }
    
    console.log("Sve lozinke su uspešno resetovane!");
    console.log("\nPodaci za prijavu:");
    console.log("====================");
    console.log("Admin nalozi:");
    
    const admins = allUsers.filter(u => u.role === "admin");
    admins.forEach(admin => {
      console.log(` - ${admin.username}`);
    });
    
    console.log("\nNalozi servisera:");
    const techs = allUsers.filter(u => u.role === "technician");
    techs.forEach(tech => {
      console.log(` - ${tech.username} (${tech.fullName})`);
    });
    
    console.log("\nLozinke su postavljene iz environment varijabli:");
    console.log("- ADMIN_RESET_PASSWORD za admin naloge");
    console.log("- TECH_RESET_PASSWORD za tehničar naloge");
    
  } catch (error) {
    console.error('Greška pri resetovanju lozinki:', error);
  } finally {
    process.exit(0);
  }
}

resetAllPasswords();