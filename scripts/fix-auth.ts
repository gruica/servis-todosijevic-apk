import { pool } from "../server/db";

async function fixAuth() {
  try {
    console.log("Popravljam konfiguraciju autentifikacije...");

    // 1. Čitanje i ispis trenutne konfiguracije auth u bazi
    const usersResult = await pool.query(`
      SELECT id, username, role, technician_id
      FROM users
      ORDER BY id
    `);
    
    console.log(`Pronađeno ${usersResult.rows.length} korisnika u bazi.`);
    
    // 2. Provera da li postoji technician_role kolona u users tabeli
    try {
      await pool.query(`
        SELECT technician_id FROM users LIMIT 1
      `);
      console.log("Kolona technician_id postoji u tabeli users.");
    } catch (err) {
      console.error("Greška pri proveri technician_id kolone:", err);
    }
    
    // 3. Promena podešavanja za prijavljenog korisnika
    console.log("\nProveravamo i popravaljamo serviserske naloge:");
    
    const techUsers = usersResult.rows.filter(u => u.role === 'technician');
    console.log(`Pronađeno ${techUsers.length} korisnika servisera.`);
    
    for (const user of techUsers) {
      // Dohvati servisera povezanog sa korisnikom
      if (!user.technician_id) {
        console.log(`UPOZORENJE: Korisnik ${user.username} (ID=${user.id}) ima ulogu servisera ali nema povezan serviser_id.`);
        continue;
      }
      
      const techResult = await pool.query(`
        SELECT id, full_name, email FROM technicians WHERE id = $1
      `, [user.technician_id]);
      
      if (techResult.rows.length === 0) {
        console.log(`GREŠKA: Korisnik ${user.username} (ID=${user.id}) povezan je sa nepostojećim serviserom ID=${user.technician_id}`);
        continue;
      }
      
      const tech = techResult.rows[0];
      console.log(`Korisnik ${user.username} (ID=${user.id}) povezan je sa serviserom ${tech.full_name} (ID=${tech.id})`);
    }
    
    // 4. Provera i ažuriranje sesijske tabele
    try {
      const sessionTableExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'session'
        );
      `);
      
      if (sessionTableExists.rows[0].exists) {
        console.log("\nSession tabela postoji u bazi.");
        
        // Proveri da li sesijska tabela ima zapise
        const sessionCount = await pool.query(`
          SELECT COUNT(*) FROM session
        `);
        
        console.log(`Broj zapisa u session tabeli: ${sessionCount.rows[0].count}`);
        
        // Obriši stare sesije ako ih ima
        if (parseInt(sessionCount.rows[0].count) > 0) {
          await pool.query(`
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
    await pool.end();
  }
}

// Pozovi funkciju
fixAuth().catch(console.error);