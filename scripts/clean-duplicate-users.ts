import { db } from "../server/db";
import { users, technicians } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

async function cleanDuplicateUsers() {
  try {
    console.log("Povezivanje sa bazom podataka...");

    // 1. Dohvati sve korisnike
    const allUsers = await db.select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      role: users.role,
      technicianId: users.technicianId
    }).from(users).orderBy(users.id);
    console.log(`Pronađeno ${allUsers.length} korisnika u bazi.`);

    // 2. Nađi duplikate po technician_id
    const technicianMap = new Map();
    const duplicates: Array<{
      original: typeof allUsers[0];
      duplicate: typeof allUsers[0];
    }> = [];

    for (const user of allUsers) {
      if (user.technicianId) {
        if (technicianMap.has(user.technicianId)) {
          // Duplikat pronađen
          duplicates.push({
            original: technicianMap.get(user.technicianId),
            duplicate: user
          });
        } else {
          technicianMap.set(user.technicianId, user);
        }
      }
    }

    console.log(`Pronađeno ${duplicates.length} dupliranih korisničkih naloga za servisere.`);

    // 3. Prikaži informacije o dupliciranim nalozima
    if (duplicates.length > 0) {
      console.log("\nPronađeni duplikati:");
      for (const dup of duplicates) {
        console.log(`Original: ID=${dup.original.id}, Username=${dup.original.username}, Ime=${dup.original.fullName}, Serviser ID=${dup.original.technicianId}`);
        console.log(`Duplikat: ID=${dup.duplicate.id}, Username=${dup.duplicate.username}, Ime=${dup.duplicate.fullName}, Serviser ID=${dup.duplicate.technicianId}`);
        console.log("---");
      }

      // 4. Obriši duple naloge
      console.log("\nBrisanje dupliranih naloga...");
      for (const dup of duplicates) {
        await db.delete(users).where(eq(users.id, dup.duplicate.id));
        console.log(`Obrisan duplirani nalog: ID=${dup.duplicate.id}, Username=${dup.duplicate.username}`);
      }
    }

    // 5. Verifikuj imena korisnika servisera
    console.log("\nVerifikovanje ispravnosti imena korisnika servisera...");
    
    // Dohvati servisere
    const allTechnicians = await db.select({
      id: technicians.id,
      fullName: technicians.fullName,
      email: technicians.email
    }).from(technicians);
    
    // Dohvati ažurirane korisnike
    const updatedUsers = await db.select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      technicianId: users.technicianId
    }).from(users).where(eq(users.role, 'technician'));
    
    for (const user of updatedUsers) {
      if (user.technicianId) {
        const technician = allTechnicians.find(t => t.id === user.technicianId);
        if (technician && technician.fullName !== user.fullName) {
          // Ažuriraj ime korisnika da odgovara imenu servisera
          console.log(`Ažuriranje imena korisnika ${user.username} sa "${user.fullName}" na "${technician.fullName}"`);
          await db.update(users)
            .set({ fullName: technician.fullName })
            .where(eq(users.id, user.id));
        }
      }
    }

    // 6. Prikaži sve servisere i njihove korisničke naloge
    console.log("\nTrenutni serviserski nalozi nakon čišćenja:");
    const finalUsers = await db.select({
      userId: users.id,
      username: users.username,
      userName: users.fullName,
      technicianId: users.technicianId,
      technicianName: technicians.fullName,
      techEmail: technicians.email
    }).from(users)
      .innerJoin(technicians, eq(users.technicianId, technicians.id))
      .where(eq(users.role, 'technician'))
      .orderBy(technicians.id);
    
    for (const user of finalUsers) {
      console.log(`Korisnik: ID=${user.userId}, Username=${user.username}`);
      console.log(`Serviser: ID=${user.technicianId}, Ime=${user.technicianName}, Email=${user.techEmail}`);
      console.log("---");
    }

    console.log("\nProces čišćenja dupliranih korisnika završen.");

  } catch (error) {
    console.error("Greška pri čišćenju dupliranih korisnika:", error);
  } finally {
    // Drizzle ORM automatically handles connection cleanup
    console.log("Završeno čišćenje duplikova.");
  }
}

// Pozovi funkciju
cleanDuplicateUsers().catch(console.error);