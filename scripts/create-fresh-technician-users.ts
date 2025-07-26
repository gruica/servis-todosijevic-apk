import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { db } from "../server/db";
import { technicians, users } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

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
    const techniciansData = await db.select({
      id: technicians.id,
      full_name: technicians.fullName,
      email: technicians.email,
      phone: technicians.phone,
      specialization: technicians.specialization
    })
    .from(technicians)
    .where(eq(technicians.active, true))
    .orderBy(technicians.id);

    console.log(`Pronađeno ${techniciansData.length} aktivnih servisera.`);

    // 2. Kreiraj novu listu korisnika za kreiranje
    const usersToCreate: Array<{
      username: string;
      fullName: string;
      technicianId: number;
    }> = [];
    
    for (const tech of techniciansData) {
      // Proveri da li postoji korisnik za ovog servisera
      const existingUser = await db.select({
        id: users.id,
        username: users.username,
        full_name: users.fullName
      })
      .from(users)
      .where(eq(users.technicianId, tech.id))
      .limit(1)
      .then(result => result[0]);
      
      if (existingUser) {
        console.log(`Korisnik već postoji za servisera ${tech.full_name}: ${existingUser.username}`);
        continue; // Preskoči kreiranje
      }
      
      // Dodaj servisera za kreiranje
      if (tech.email) {
        usersToCreate.push({
          username: tech.email,
          fullName: tech.full_name,
          technicianId: tech.id
        });
      } else {
        console.log(`PRESKAČEM: Serviser ${tech.full_name} nema email adresu`);
      }
    }

    console.log(`\nPotrebno je kreirati ${usersToCreate.length} novih korisnika.`);

    // 3. Kreiraj korisnike
    const password = process.env.DEFAULT_TECHNICIAN_PASSWORD || "temp123";
    if (!process.env.DEFAULT_TECHNICIAN_PASSWORD) {
      console.warn("⚠️  WARNING: DEFAULT_TECHNICIAN_PASSWORD environment variable not set. Using temporary password.");
    }
    const hashedPassword = await hashPassword(password);
    
    for (const user of usersToCreate) {
      // Prvo, proveri da li korisničko ime već postoji
      const usernameExists = await db.select({ id: users.id })
        .from(users)
        .where(eq(users.username, user.username))
        .limit(1)
        .then(result => result.length > 0);
      
      if (usernameExists) {
        console.log(`PRESKAČEM: Korisničko ime ${user.username} već postoji u bazi`);
        continue;
      }
      
      // Kreiraj korisnika
      const [newUser] = await db.insert(users)
        .values({
          username: user.username,
          password: hashedPassword,
          fullName: user.fullName,
          role: 'technician',
          technicianId: user.technicianId
        })
        .returning({
          id: users.id,
          username: users.username,
          full_name: users.fullName,
          role: users.role
        });
      console.log(`KREIRAN: Korisnik ${newUser.username} (ID=${newUser.id}) za servisera ${user.fullName} (ID=${user.technicianId})`);
    }

    // 4. Ispis trenutnog stanja
    console.log("\nTrenutni serviserski nalozi:");
    const currentUsers = await db.select({
      user_id: users.id,
      username: users.username,
      user_name: users.fullName,
      technician_id: users.technicianId,
      technician_name: technicians.fullName,
      tech_email: technicians.email
    })
    .from(users)
    .innerJoin(technicians, eq(users.technicianId, technicians.id))
    .where(eq(users.role, 'technician'))
    .orderBy(technicians.id);
    
    for (const user of currentUsers) {
      console.log(`Korisnik: ID=${user.user_id}, Username=${user.username}`);
      console.log(`Serviser: ID=${user.technician_id}, Ime=${user.technician_name}, Email=${user.tech_email}`);
      console.log("---");
    }

    console.log(`\nProces kreiranja korisničkih naloga servisera je završen.`);
    console.log(`Šifra za nove naloge servisera je postavljena iz environment varijable.`);

  } catch (error) {
    console.error("Greška pri kreiranju korisnika servisera:", error);
  }
}

// Pozovi funkciju
createFreshTechnicianUsers().catch(console.error);