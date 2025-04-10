import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { db } from "../server/db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function fixAdminUser() {
  try {
    console.log("Popravljanje admin korisnika...");
    
    // Pronađi admin korisnika
    const adminUsers = await db.select().from(users).where(eq(users.role, "admin"));
    
    if (adminUsers.length === 0) {
      console.log("Admin korisnik nije pronađen. Kreiram novog admin korisnika...");
      
      // Kreiraj novog admin korisnika ako ne postoji
      const hashedPassword = await hashPassword("admin123");
      
      await db.insert(users).values({
        username: "admin",
        password: hashedPassword,
        fullName: "Jelena Todosijević",
        role: "admin",
        email: "admin@frigosistemtodosijevic.com",
        technicianId: null
      });
      
      console.log("Kreiran novi admin korisnik 'admin' sa lozinkom 'admin123'");
    } else {
      console.log(`Pronađeno ${adminUsers.length} admin korisnika.`);
      
      // Ažuriraj prvog admin korisnika
      const admin = adminUsers[0];
      
      const hashedPassword = await hashPassword("admin123");
      
      await db.update(users)
        .set({ 
          username: "admin", 
          password: hashedPassword 
        })
        .where(eq(users.id, admin.id));
      
      console.log(`Admin korisnik (ID: ${admin.id}) ažuriran na korisničko ime 'admin' sa lozinkom 'admin123'`);
    }
    
    console.log("Popravljanje admin korisnika završeno.");
  } catch (error) {
    console.error("Greška prilikom popravljanja admin korisnika:", error);
  }
}

fixAdminUser().catch(console.error);