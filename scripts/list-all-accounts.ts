import { pool } from "../server/db";

async function listAllAccounts() {
  try {
    console.log("Dohvatanje svih korisničkih naloga iz baze...");

    // 1. Dohvati sve administratorske naloge
    const adminResult = await pool.query(`
      SELECT id, username, full_name, role 
      FROM users 
      WHERE role = 'admin'
      ORDER BY id
    `);
    
    console.log("\n=== ADMINISTRATORSKI NALOZI ===");
    console.log("Broj administratorskih naloga:", adminResult.rows.length);
    console.log("------------------------------------");
    
    for (const admin of adminResult.rows) {
      console.log(`ID: ${admin.id}`);
      console.log(`Korisničko ime: ${admin.username}`);
      console.log(`Ime i prezime: ${admin.full_name}`);
      console.log(`Šifra: admin123`);
      console.log("------------------------------------");
    }

    // 2. Dohvati sve serviserske naloge sa vezama ka serviserima
    const technicianResult = await pool.query(`
      SELECT u.id, u.username, u.full_name, u.technician_id,
             t.specialization, t.phone, t.email as tech_email
      FROM users u
      JOIN technicians t ON u.technician_id = t.id
      WHERE u.role = 'technician'
      ORDER BY t.id
    `);
    
    console.log("\n=== SERVISERSKI NALOZI ===");
    console.log("Broj serviserskih naloga:", technicianResult.rows.length);
    console.log("------------------------------------");
    
    for (const tech of technicianResult.rows) {
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
  } finally {
    await pool.end();
  }
}

// Pozovi funkciju
listAllAccounts().catch(console.error);