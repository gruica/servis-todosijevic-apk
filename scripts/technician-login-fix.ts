import { db } from "../server/db";
import { eq, and, isNull } from "drizzle-orm";
import { users, technicians } from "../shared/schema";

async function fixTechnicianLogin() {
  try {
    console.log("Popravljam login podatke za servisere...");

    // 1. Obriši korisnika bez povezanog servisera
    console.log("\nBrisanje korisnika servisera bez povezanog servisera:");
    const deleteResult = await db
      .delete(users)
      .where(and(
        eq(users.role, 'technician'),
        isNull(users.technicianId)
      ))
      .returning({ id: users.id, username: users.username });
    
    if (deleteResult.length > 0) {
      for (const user of deleteResult) {
        console.log(`Obrisan korisnik: ${user.username} (ID=${user.id})`);
      }
    } else {
      console.log("Nema korisnika servisera bez povezanog servisera.");
    }

    // 2. Ažuriraj korisnička imena da se poklapaju sa email-om servisera
    console.log("\nAžuriranje korisničkih imena servisera da se poklapaju sa email-om:");
    
    const techUsers = await db
      .select({
        user_id: users.id,
        username: users.username,
        user_name: users.fullName,
        tech_id: technicians.id,
        tech_name: technicians.fullName,
        tech_email: technicians.email
      })
      .from(users)
      .innerJoin(technicians, eq(users.technicianId, technicians.id))
      .where(eq(users.role, 'technician'));
    
    for (const user of techUsers) {
      if (user.tech_email && user.username !== user.tech_email) {
        console.log(`Ažuriranje korisničkog imena za ${user.user_name} sa "${user.username}" na "${user.tech_email}"`);
        
        await db
          .update(users)
          .set({ username: user.tech_email })
          .where(eq(users.id, user.user_id));
      } else if (user.tech_email) {
        console.log(`Korisničko ime već ispravno za ${user.user_name}: ${user.username}`);
      } else {
        console.log(`Serviser ${user.user_name} nema definisan email - preskačem ažuriranje`);
      }
    }

    // 3. Ispisivanje konačnog stanja korisnika servisera
    console.log("\nTrenutni korisnici serviseri:");
    
    const finalUsers = await db
      .select({
        user_id: users.id,
        username: users.username,
        user_name: users.fullName,
        tech_id: technicians.id,
        tech_name: technicians.fullName,
        tech_email: technicians.email
      })
      .from(users)
      .innerJoin(technicians, eq(users.technicianId, technicians.id))
      .where(eq(users.role, 'technician'))
      .orderBy(technicians.id);
    
    for (const user of finalUsers) {
      console.log(`Korisnik: ID=${user.user_id}, Username=${user.username}, Ime=${user.user_name}`);
      console.log(`Serviser: ID=${user.tech_id}, Ime=${user.tech_name}, Email=${user.tech_email}`);
      console.log("---");
    }

    console.log("\nProces popravke login podataka za servisere je završen.");
    
  } catch (error) {
    console.error("Greška pri popravci login podataka za servisere:", error);
  }
}

// Pozovi funkciju
fixTechnicianLogin().catch(console.error);