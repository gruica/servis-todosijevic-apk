import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function createAdmin() {
  try {
    console.log("Kreiranje administratorskog naloga...");

    // 1. Proveri da li već postoji admin nalog
    const adminCheck = await db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName
      })
      .from(users)
      .where(eq(users.role, 'admin'));
    
    if (adminCheck.length > 0) {
      console.log("Administratorski nalozi već postoje:");
      for (const admin of adminCheck) {
        console.log(`ID=${admin.id}, Username=${admin.username}, Ime=${admin.fullName}`);
      }
      
      // Resetuj šifru za admina
      const defaultPassword = "admin123";
      const hashedPassword = await hashPassword(defaultPassword);
      
      for (const admin of adminCheck) {
        await db
          .update(users)
          .set({ password: hashedPassword })
          .where(eq(users.id, admin.id));
        
        console.log(`Resetovana šifra za admina: ${admin.username} (${admin.fullName})`);
      }
      
      console.log(`\nNova šifra za sve administratore je: ${defaultPassword}`);
    } else {
      // Kreiraj novog admina
      const username = "admin@servistodosijevic.me";
      const fullName = "Administrator Sistema";
      const password = "admin123";
      const hashedPassword = await hashPassword(password);
      
      const result = await db
        .insert(users)
        .values({
          username,
          password: hashedPassword,
          fullName,
          role: 'admin'
        })
        .returning({
          id: users.id,
          username: users.username,
          fullName: users.fullName,
          role: users.role
        });
      
      const newAdmin = result[0];
      console.log(`\nKreiran novi administrator:`);
      console.log(`ID=${newAdmin.id}, Username=${newAdmin.username}, Ime=${newAdmin.fullName}`);
      console.log(`Šifra za novog administratora je: ${password}`);
    }

    console.log("\nProces provere/kreiranja administratorskog naloga je završen.");
    
  } catch (error) {
    console.error("Greška pri kreiranju administratorskog naloga:", error);
  } finally {
    // Note: No need to manually close Drizzle db connection
    // as it manages connections automatically
    process.exit(0);
  }
}

// Pozovi funkciju
createAdmin().catch(console.error);