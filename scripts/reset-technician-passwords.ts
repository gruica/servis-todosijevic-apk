/**
 * Skripta za resetovanje lozinki servisera na standardnu vrednost
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

async function resetTechnicianPasswords() {
  try {
    console.log("Dohvatanje servisera...");
    
    // Standardna lozinka za servisere
    const standardPassword = "serviser123";
    
    // 1. Dohvati korisnike koji su povezani sa serviserima (koji imaju technician_id)
    const technicianUsersResult = await pool.query(`
      SELECT u.id, u.username, u.full_name, t.full_name as technician_name, t.specialization
      FROM users u
      JOIN technicians t ON u.technician_id = t.id
      WHERE u.role = 'technician'
    `);
    
    const technicianUsers = technicianUsersResult.rows;
    
    console.log(`Pronađeno ${technicianUsers.length} korisničkih naloga za servisere.\n`);
    
    if (technicianUsers.length === 0) {
      console.log("Nema korisničkih naloga za servisere u bazi.");
      return;
    }
    
    // Resetovanje lozinke za svakog servisera
    for (const user of technicianUsers) {
      const hashedPassword = await hashPassword(standardPassword);
      
      // Direktan SQL upit za ažuriranje lozinke
      await pool.query(`
        UPDATE users
        SET password = $1
        WHERE id = $2
      `, [hashedPassword, user.id]);
      
      console.log(`Resetovana lozinka za servisera: ${user.full_name} (${user.specialization || 'bez specijalizacije'})`);
    }
    
    console.log("\nLozinke uspešno resetovane za sve servisere.");
    console.log(`Nova lozinka za sve servisere je: ${standardPassword}`);
    
  } catch (error) {
    console.error("Greška pri resetovanju lozinki:", error);
  } finally {
    await pool.end();
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