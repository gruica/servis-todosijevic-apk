import { db } from "../server/db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function resetUserPasswords() {
  console.log("Resetovanje lozinki za sve korisničke uloge...");
  
  try {
    // Resetovanje admin lozinke
    const adminPassword = await hashPassword("admin123");
    await db.update(users)
      .set({ password: adminPassword })
      .where(eq(users.role, "admin"));
    console.log("✅ Admin lozinka resetovana na: admin123");
    
    // Resetovanje technician lozinke
    const technicianPassword = await hashPassword("tech123");
    await db.update(users)
      .set({ password: technicianPassword })
      .where(eq(users.role, "technician"));
    console.log("✅ Technician lozinka resetovana na: tech123");
    
    // Resetovanje customer lozinke
    const customerPassword = await hashPassword("customer123");
    await db.update(users)
      .set({ password: customerPassword })
      .where(eq(users.role, "customer"));
    console.log("✅ Customer lozinka resetovana na: customer123");
    
    // Resetovanje business partner lozinke
    const businessPassword = await hashPassword("business123");
    await db.update(users)
      .set({ password: businessPassword })
      .where(eq(users.role, "business"));
    console.log("✅ Business partner lozinka resetovana na: business123");
    
    // Ispis kredencijala
    console.log("\n=== KREDENCIJALI ZA TESTIRANJE ===");
    console.log("Admin: jelena@frigosistemtodosijevic.me / admin123");
    console.log("Technician: jovan@servistodosijevic.me / tech123");
    console.log("Customer: Dušanov Vrt / customer123");
    console.log("Business: robert.ivezic@tehnoplus.me / business123");
    
  } catch (error) {
    console.error("Greška:", error);
  }
}

resetUserPasswords().then(() => {
  console.log("Resetovanje lozinki završeno");
  process.exit(0);
}).catch(console.error);