import { db } from "../server/db";
import { users, technicians } from "../shared/schema";
import { eq } from "drizzle-orm";

async function listAllAccounts() {
  try {
    console.log("Dohvatanje svih korisničkih naloga iz baze...");

    // 1. Dohvati sve administratorske naloge
    const adminResult = await db
      .select({
        id: users.id,
        username: users.username,
        full_name: users.fullName,
        role: users.role
      })
      .from(users)
      .where(eq(users.role, 'admin'))
      .orderBy(users.id);
    
    console.log("\n=== ADMINISTRATORSKI NALOZI ===");
    console.log("Broj administratorskih naloga:", adminResult.length);
    console.log("------------------------------------");
    
    for (const admin of adminResult) {
      console.log(`ID: ${admin.id}`);
      console.log(`Korisničko ime: ${admin.username}`);
      console.log(`Ime i prezime: ${admin.full_name}`);
      console.log(`Šifra: admin123`);
      console.log("------------------------------------");
    }

    // 2. Dohvati sve serviserske naloge sa vezama ka serviserima
    const technicianResult = await db
      .select({
        id: users.id,
        username: users.username,
        full_name: users.fullName,
        technician_id: users.technicianId,
        specialization: technicians.specialization,
        phone: technicians.phone,
        tech_email: technicians.email
      })
      .from(users)
      .innerJoin(technicians, eq(users.technicianId, technicians.id))
      .where(eq(users.role, 'technician'))
      .orderBy(technicians.id);
    
    console.log("\n=== SERVISERSKI NALOZI ===");
    console.log("Broj serviserskih naloga:", technicianResult.length);
    console.log("------------------------------------");
    
    for (const tech of technicianResult) {
      console.log(`ID korisnika: ${tech.id}`);
      console.log(`Korisničko ime: ${tech.username}`);
      console.log(`Ime i prezime: ${tech.full_name}`);
      console.log(`ID servisera: ${tech.technician_id}`);
      console.log(`Specijalizacija: ${tech.specialization}`);
      console.log(`Telefon: ${tech.phone}`);
      console.log(`Email: ${tech.tech_email}`);
      console.log(`Šifra: serviser123`);
      console.log("------------------------------------");
    }

    console.log("\nSvi korisnički nalozi su uspešno prikazani.");
    console.log("Napomena: Administratorske šifre su 'admin123', a serviserske 'serviser123'.");

  } catch (error) {
    console.error("Greška pri dohvatanju korisničkih naloga:", error);
  }
}

// Pozovi funkciju
listAllAccounts().catch(console.error);