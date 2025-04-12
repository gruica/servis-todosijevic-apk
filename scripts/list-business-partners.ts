/**
 * Skripta za prikaz poslovnih partnera i njihovih kredencijala
 */
import { db } from "../server/db";

async function listBusinessPartners() {
  try {
    console.log("Dohvatanje poslovnih partnera...");
    
    // Dohvati sve korisnike sa ulogom "business"
    const businessPartners = await db.query.users.findMany({
      where: (users, { eq }) => eq(users.role, "business"),
      columns: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        companyName: true,
        password: true // uključićemo lozinke radi dijagnostike
      }
    });
    
    console.log(`Pronađeno ${businessPartners.length} poslovnih partnera:\n`);
    
    if (businessPartners.length === 0) {
      console.log("Nema poslovnih partnera u bazi.");
      return;
    }
    
    // Prikazujemo detaljne informacije
    businessPartners.forEach((partner, index) => {
      console.log(`Poslovni partner #${index + 1}:`);
      console.log(`- ID: ${partner.id}`);
      console.log(`- Korisničko ime: ${partner.username}`);
      console.log(`- Ime: ${partner.fullName}`);
      console.log(`- Email: ${partner.email || 'Nije postavljen'}`);
      console.log(`- Telefon: ${partner.phone || 'Nije postavljen'}`);
      console.log(`- Firma: ${partner.companyName || 'Nije postavljena'}`);
      console.log(`- Lozinka (hash): ${partner.password}`);
      console.log("------------------------");
    });
    
  } catch (error) {
    console.error("Greška pri dohvatanju poslovnih partnera:", error);
  }
}

// Pokreni funkciju
listBusinessPartners().then(() => {
  console.log("Gotovo.");
  process.exit(0);
}).catch(error => {
  console.error("Greška:", error);
  process.exit(1);
});