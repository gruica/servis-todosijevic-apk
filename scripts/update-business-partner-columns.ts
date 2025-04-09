import { db, pool } from "../server/db";

/**
 * Skripta za ažuriranje šeme baze podataka
 * dodavanjem kolona za poslovne partnere u tabele users i services
 */
async function updateBusinessPartnerColumns() {
  console.log("Ažuriranje kolona za poslovne partnere...");
  
  try {
    // Dodavanje kolona u users tabelu
    await pool.query(`
      DO $$
      BEGIN
        BEGIN
          ALTER TABLE users ADD COLUMN company_name TEXT;
        EXCEPTION
          WHEN duplicate_column THEN RAISE NOTICE 'Kolona company_name već postoji u tabeli users.';
        END;
        
        BEGIN
          ALTER TABLE users ADD COLUMN company_id TEXT;
        EXCEPTION
          WHEN duplicate_column THEN RAISE NOTICE 'Kolona company_id već postoji u tabeli users.';
        END;
      END $$;
    `);
    
    console.log("✓ Uspešno dodate kolone u users tabelu.");
    
    // Dodavanje kolona u services tabelu
    await pool.query(`
      DO $$
      BEGIN
        BEGIN
          ALTER TABLE services ADD COLUMN business_partner_id INTEGER;
        EXCEPTION
          WHEN duplicate_column THEN RAISE NOTICE 'Kolona business_partner_id već postoji u tabeli services.';
        END;
        
        BEGIN
          ALTER TABLE services ADD COLUMN partner_company_name TEXT;
        EXCEPTION
          WHEN duplicate_column THEN RAISE NOTICE 'Kolona partner_company_name već postoji u tabeli services.';
        END;
      END $$;
    `);
    
    console.log("✓ Uspešno dodate kolone u services tabelu.");
    
    console.log("✓ Ažuriranje kolona za poslovne partnere uspešno završeno.");
  } catch (error) {
    console.error("❌ Greška pri ažuriranju kolona za poslovne partnere:", error);
  } finally {
    await pool.end();
  }
}

// Pokrenimo ažuriranje kolona
updateBusinessPartnerColumns()
  .then(() => {
    console.log("Skripta je završena");
    process.exit(0);
  })
  .catch(err => {
    console.error("Greška u skripti:", err);
    process.exit(1);
  });