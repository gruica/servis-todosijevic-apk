import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { pool } from "../server/db";

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
    const adminCheck = await pool.query(`
      SELECT id, username, full_name 
      FROM users 
      WHERE role = 'admin'
    `);
    
    if (adminCheck.rows.length > 0) {
      console.log("Administratorski nalozi već postoje:");
      for (const admin of adminCheck.rows) {
        console.log(`ID=${admin.id}, Username=${admin.username}, Ime=${admin.full_name}`);
      }
      
      // Resetuj šifru za admina
      const defaultPassword = "admin123";
      const hashedPassword = await hashPassword(defaultPassword);
      
      for (const admin of adminCheck.rows) {
        await pool.query(`
          UPDATE users
          SET password = $1
          WHERE id = $2
        `, [hashedPassword, admin.id]);
        
        console.log(`Resetovana šifra za admina: ${admin.username} (${admin.full_name})`);
      }
      
      console.log(`\nNova šifra za sve administratore je: ${defaultPassword}`);
    } else {
      // Kreiraj novog admina
      const username = "admin@servistodosijevic.me";
      const fullName = "Administrator Sistema";
      const password = "admin123";
      const hashedPassword = await hashPassword(password);
      
      const result = await pool.query(`
        INSERT INTO users (username, password, full_name, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id, username, full_name, role
      `, [username, hashedPassword, fullName, 'admin']);
      
      const newAdmin = result.rows[0];
      console.log(`\nKreiran novi administrator:`);
      console.log(`ID=${newAdmin.id}, Username=${newAdmin.username}, Ime=${newAdmin.full_name}`);
      console.log(`Šifra za novog administratora je: ${password}`);
    }

    console.log("\nProces provere/kreiranja administratorskog naloga je završen.");
    
  } catch (error) {
    console.error("Greška pri kreiranju administratorskog naloga:", error);
  } finally {
    await pool.end();
  }
}

// Pozovi funkciju
createAdmin().catch(console.error);