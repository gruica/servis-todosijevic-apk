import { pool } from "../server/db";

async function cleanDuplicateUsers() {
  try {
    console.log("Povezivanje sa bazom podataka...");

    // 1. Dohvati sve korisnike
    const result = await pool.query(`
      SELECT id, username, full_name, role, technician_id
      FROM users
      ORDER BY id
    `);

    const users = result.rows;
    console.log(`Pronađeno ${users.length} korisnika u bazi.`);

    // 2. Nađi duplikate po technician_id
    const technicianMap = new Map();
    const duplicates = [];

    for (const user of users) {
      if (user.technician_id) {
        if (technicianMap.has(user.technician_id)) {
          // Duplikat pronađen
          duplicates.push({
            original: technicianMap.get(user.technician_id),
            duplicate: user
          });
        } else {
          technicianMap.set(user.technician_id, user);
        }
      }
    }

    console.log(`Pronađeno ${duplicates.length} dupliranih korisničkih naloga za servisere.`);

    // 3. Prikaži informacije o dupliciranim nalozima
    if (duplicates.length > 0) {
      console.log("\nPronađeni duplikati:");
      for (const dup of duplicates) {
        console.log(`Original: ID=${dup.original.id}, Username=${dup.original.username}, Ime=${dup.original.full_name}, Serviser ID=${dup.original.technician_id}`);
        console.log(`Duplikat: ID=${dup.duplicate.id}, Username=${dup.duplicate.username}, Ime=${dup.duplicate.full_name}, Serviser ID=${dup.duplicate.technician_id}`);
        console.log("---");
      }

      // 4. Obriši duple naloge
      console.log("\nBrisanje dupliranih naloga...");
      for (const dup of duplicates) {
        await pool.query(`
          DELETE FROM users
          WHERE id = $1
        `, [dup.duplicate.id]);
        console.log(`Obrisan duplirani nalog: ID=${dup.duplicate.id}, Username=${dup.duplicate.username}`);
      }
    }

    // 5. Verifikuj imena korisnika servisera
    console.log("\nVerifikovanje ispravnosti imena korisnika servisera...");
    
    // Dohvati servisere
    const techResult = await pool.query(`
      SELECT id, full_name, email FROM technicians
    `);
    const technicians = techResult.rows;
    
    // Dohvati ažurirane korisnike
    const updatedUsers = (await pool.query(`
      SELECT id, username, full_name, technician_id FROM users
      WHERE role = 'technician'
    `)).rows;
    
    for (const user of updatedUsers) {
      if (user.technician_id) {
        const technician = technicians.find(t => t.id === user.technician_id);
        if (technician && technician.full_name !== user.full_name) {
          // Ažuriraj ime korisnika da odgovara imenu servisera
          console.log(`Ažuriranje imena korisnika ${user.username} sa "${user.full_name}" na "${technician.full_name}"`);
          await pool.query(`
            UPDATE users
            SET full_name = $1
            WHERE id = $2
          `, [technician.full_name, user.id]);
        }
      }
    }

    // 6. Prikaži sve servisere i njihove korisničke naloge
    console.log("\nTrenutni serviserski nalozi nakon čišćenja:");
    const finalUsers = (await pool.query(`
      SELECT u.id as user_id, u.username, u.full_name as user_name, 
             u.technician_id, t.full_name as technician_name, t.email as tech_email
      FROM users u
      JOIN technicians t ON u.technician_id = t.id
      WHERE u.role = 'technician'
      ORDER BY t.id
    `)).rows;
    
    for (const user of finalUsers) {
      console.log(`Korisnik: ID=${user.user_id}, Username=${user.username}`);
      console.log(`Serviser: ID=${user.technician_id}, Ime=${user.technician_name}, Email=${user.tech_email}`);
      console.log("---");
    }

    console.log("\nProces čišćenja dupliranih korisnika završen.");

  } catch (error) {
    console.error("Greška pri čišćenju dupliranih korisnika:", error);
  } finally {
    await pool.end();
  }
}

// Pozovi funkciju
cleanDuplicateUsers().catch(console.error);