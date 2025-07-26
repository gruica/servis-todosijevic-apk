import { db } from "../server/db";
import { users, technicians } from "../shared/schema";
import { sql, eq, count } from "drizzle-orm";

async function fixAuth() {
  try {
    console.log("Popravljam konfiguraciju autentifikacije...");

    // 1. Čitanje i ispis trenutne konfiguracije auth u bazi
    const usersResult = await db.select({
      id: users.id,
      username: users.username,
      role: users.role,
      technician_id: users.technicianId
    }).from(users).orderBy(users.id);
    
    console.log(`Pronađeno ${usersResult.length} korisnika u bazi.`);
    
    // 2. Provera da li postoji technician_id kolona u users tabeli
    try {
      await db.select({ technician_id: users.technicianId }).from(users).limit(1);
      console.log("Kolona technician_id postoji u tabeli users.");
    } catch (err) {
      console.error("Greška pri proveri technician_id kolone:", err);
    }
    
    // 3. Promena podešavanja za prijavljenog korisnika
    console.log("\nProveravamo i popravaljamo serviserske naloge:");
    
    const techUsers = usersResult.filter(u => u.role === 'technician');
    console.log(`Pronađeno ${techUsers.length} korisnika servisera.`);
    
    for (const user of techUsers) {
      // Dohvati servisera povezanog sa korisnikom
      if (!user.technician_id) {
        console.log(`UPOZORENJE: Korisnik ${user.username} (ID=${user.id}) ima ulogu servisera ali nema povezan serviser_id.`);
        continue;
      }
      
      const techResult = await db.select({
        id: technicians.id,
        full_name: technicians.fullName,
        email: technicians.email
      }).from(technicians).where(eq(technicians.id, user.technician_id));
      
      if (techResult.length === 0) {
        console.log(`GREŠKA: Korisnik ${user.username} (ID=${user.id}) povezan je sa nepostojećim serviserom ID=${user.technician_id}`);
        continue;
      }
      
      const tech = techResult[0];
      console.log(`Korisnik ${user.username} (ID=${user.id}) povezan je sa serviserom ${tech.full_name} (ID=${tech.id})`);
    }
    
    // 4. Provera i ažuriranje sesijske tabele
    try {
      const sessionTableExists = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'session'
        )
      `);
      
      if (sessionTableExists[0]?.exists) {
        console.log("\nSession tabela postoji u bazi.");
        
        // Proveri da li sesijska tabela ima zapise
        const sessionCount = await db.execute(sql`
          SELECT COUNT(*) FROM session
        `);
        
        console.log(`Broj zapisa u session tabeli: ${sessionCount[0]?.count}`);
        
        // Obriši stare sesije ako ih ima
        if (parseInt(sessionCount[0]?.count || '0') > 0) {
          await db.execute(sql`
            DELETE FROM session
          `);
          console.log("Obrisane stare sesije iz session tabele.");
        }
      } else {
        console.log("\nSession tabela ne postoji u bazi. Biće kreirana automatski pri pokretanju aplikacije.");
      }
    } catch (err) {
      console.error("Greška pri proveri session tabele:", err);
    }
    
    console.log("\nProces popravke autentifikacije je završen.");
    
  } catch (error) {
    console.error("Greška pri popravci autentifikacije:", error);
  } finally {
    // Drizzle handles connection management automatically
    process.exit(0);
  }
}

// Pozovi funkciju
fixAuth().catch(console.error);