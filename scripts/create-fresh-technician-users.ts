import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { pool } from "../server/db";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function createFreshTechnicianUsers() {
  try {
    console.log("Povezivanje sa bazom podataka...");

    // 1. Dohvati sve servisere
    const technicians = (await pool.query(`
      SELECT id, full_name, email, phone, specialization 
      FROM technicians
      WHERE active = true
      ORDER BY id
    `)).rows;

    console.log(`Pronađeno ${technicians.length} aktivnih servisera.`);

    // 2. Kreiraj novu listu korisnika za kreiranje
    const usersToCreate = [];
    
    for (const tech of technicians) {
      // Proveri da li postoji korisnik za ovog servisera
      const existingUser = (await pool.query(`
        SELECT id, username, full_name 
        FROM users
        WHERE technician_id = $1
      `, [tech.id])).rows[0];
      
      if (existingUser) {
        console.log(`Korisnik već postoji za servisera ${tech.full_name}: ${existingUser.username}`);
        continue; // Preskoči kreiranje
      }
      
      // Dodaj servisera za kreiranje
      usersToCreate.push({
        username: tech.email,
        fullName: tech.full_name,
        technicianId: tech.id
      });
    }

    console.log(`\nPotrebno je kreirati ${usersToCreate.length} novih korisnika.`);

    // 3. Kreiraj korisnike
    const password = "serviser123";
    const hashedPassword = await hashPassword(password);
    
    for (const user of usersToCreate) {
      // Prvo, proveri da li korisničko ime već postoji
      const usernameExists = (await pool.query(`
        SELECT id FROM users WHERE username = $1
      `, [user.username])).rowCount > 0;
      
      if (usernameExists) {
        console.log(`PRESKAČEM: Korisničko ime ${user.username} već postoji u bazi`);
        continue;
      }
      
      // Kreiraj korisnika
      const result = await pool.query(`
        INSERT INTO users (username, password, full_name, role, technician_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, username, full_name, role
      `, [user.username, hashedPassword, user.fullName, 'technician', user.technicianId]);
      
      const newUser = result.rows[0];
      console.log(`KREIRAN: Korisnik ${newUser.username} (ID=${newUser.id}) za servisera ${user.fullName} (ID=${user.technicianId})`);
    }

    // 4. Ispis trenutnog stanja
    console.log("\nTrenutni serviserski nalozi:");
    const currentUsers = (await pool.query(`
      SELECT u.id as user_id, u.username, u.full_name as user_name, 
             u.technician_id, t.full_name as technician_name, t.email as tech_email
      FROM users u
      JOIN technicians t ON u.technician_id = t.id
      WHERE u.role = 'technician'
      ORDER BY t.id
    `)).rows;
    
    for (const user of currentUsers) {
      console.log(`Korisnik: ID=${user.user_id}, Username=${user.username}`);
      console.log(`Serviser: ID=${user.technician_id}, Ime=${user.technician_name}, Email=${user.tech_email}`);
      console.log("---");
    }

    console.log(`\nProces kreiranja korisničkih naloga servisera je završen.`);
    console.log(`Šifra za nove naloge servisera je: ${password}`);

  } catch (error) {
    console.error("Greška pri kreiranju korisnika servisera:", error);
  } finally {
    await pool.end();
  }
}

// Pozovi funkciju
createFreshTechnicianUsers().catch(console.error);