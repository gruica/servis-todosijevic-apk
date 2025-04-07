import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { pool } from "../server/db";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function resetTechnicianPasswords() {
  try {
    console.log("Povezivanje sa bazom podataka...");

    // 1. Dohvati sve korisnike servisere
    const result = await pool.query(`
      SELECT u.id, u.username, u.full_name, t.id as tech_id
      FROM users u
      JOIN technicians t ON u.technician_id = t.id
      WHERE u.role = 'technician'
    `);

    const users = result.rows;
    console.log(`Pronađeno ${users.length} korisnika servisera.`);

    if (users.length === 0) {
      console.log("Nema korisnika servisera za reset šifre.");
      return;
    }

    // 2. Resetuj šifru za svakog korisnika
    const defaultPassword = "serviser123";
    const hashedPassword = await hashPassword(defaultPassword);

    console.log(`\nResetovanje šifri za sve korisnike servisera na "${defaultPassword}"...`);
    
    for (const user of users) {
      await pool.query(`
        UPDATE users
        SET password = $1
        WHERE id = $2
      `, [hashedPassword, user.id]);
      
      console.log(`Resetovana šifra za korisnika: ${user.username} (${user.full_name})`);
    }

    console.log("\nResetovanje šifri za korisnike servisera je završeno.");
    console.log(`Nova šifra za sve servisere je: ${defaultPassword}`);

  } catch (error) {
    console.error("Greška pri resetovanju šifri servisera:", error);
  } finally {
    await pool.end();
  }
}

// Pozovi funkciju
resetTechnicianPasswords().catch(console.error);