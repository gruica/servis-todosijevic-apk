import { pool } from "../server/db";

async function fixTechnicianLogin() {
  try {
    console.log("Popravljam login podatke za servisere...");

    // 1. Obriši korisnika bez povezanog servisera
    console.log("\nBrisanje korisnika servisera bez povezanog servisera:");
    const deleteResult = await pool.query(`
      DELETE FROM users 
      WHERE role = 'technician' AND technician_id IS NULL
      RETURNING id, username
    `);
    
    if (deleteResult.rows.length > 0) {
      for (const user of deleteResult.rows) {
        console.log(`Obrisan korisnik: ${user.username} (ID=${user.id})`);
      }
    } else {
      console.log("Nema korisnika servisera bez povezanog servisera.");
    }

    // 2. Ažuriraj korisnička imena da se poklapaju sa email-om servisera
    console.log("\nAžuriranje korisničkih imena servisera da se poklapaju sa email-om:");
    
    const techUsers = await pool.query(`
      SELECT u.id as user_id, u.username, u.full_name as user_name,
             t.id as tech_id, t.full_name as tech_name, t.email as tech_email
      FROM users u
      JOIN technicians t ON u.technician_id = t.id
      WHERE u.role = 'technician'
    `);
    
    for (const user of techUsers.rows) {
      if (user.username !== user.tech_email) {
        console.log(`Ažuriranje korisničkog imena za ${user.user_name} sa "${user.username}" na "${user.tech_email}"`);
        
        await pool.query(`
          UPDATE users
          SET username = $1
          WHERE id = $2
        `, [user.tech_email, user.user_id]);
      } else {
        console.log(`Korisničko ime već ispravno za ${user.user_name}: ${user.username}`);
      }
    }

    // 3. Ispisivanje konačnog stanja korisnika servisera
    console.log("\nTrenutni korisnici serviseri:");
    
    const finalUsers = await pool.query(`
      SELECT u.id as user_id, u.username, u.full_name as user_name,
             t.id as tech_id, t.full_name as tech_name, t.email as tech_email
      FROM users u
      JOIN technicians t ON u.technician_id = t.id
      WHERE u.role = 'technician'
      ORDER BY t.id
    `);
    
    for (const user of finalUsers.rows) {
      console.log(`Korisnik: ID=${user.user_id}, Username=${user.username}, Ime=${user.user_name}`);
      console.log(`Serviser: ID=${user.tech_id}, Ime=${user.tech_name}, Email=${user.tech_email}`);
      console.log("---");
    }

    console.log("\nProces popravke login podataka za servisere je završen.");
    
  } catch (error) {
    console.error("Greška pri popravci login podataka za servisere:", error);
  } finally {
    await pool.end();
  }
}

// Pozovi funkciju
fixTechnicianLogin().catch(console.error);