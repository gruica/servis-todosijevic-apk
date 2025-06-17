import { db } from "../server/db";
import { users } from "../shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function createBusinessPartner() {
  try {
    console.log("Kreiranje test poslovnog partnera...");
    
    const hashedPassword = await hashPassword("partner123");
    
    const [businessPartner] = await db.insert(users).values({
      username: "testpartner",
      password: hashedPassword,
      fullName: "Test Poslovni Partner",
      role: "business_partner",
      email: "partner@test.com",
      phone: "067123456",
      companyName: "Test Kompanija d.o.o.",
      companyId: "12345678",
      isVerified: true, // Postavljamo kao verifikovan
      registeredAt: new Date(),
      verifiedAt: new Date(),
      verifiedBy: 1 // Verifikovan od strane admin-a sa ID 1
    }).returning();
    
    console.log("✓ Business partner uspešno kreiran:");
    console.log(`  Username: ${businessPartner.username}`);
    console.log(`  Password: partner123`);
    console.log(`  Kompanija: ${businessPartner.companyName}`);
    console.log(`  Email: ${businessPartner.email}`);
    console.log(`  Verifikovan: ${businessPartner.isVerified}`);
    
  } catch (error) {
    console.error("Greška pri kreiranju business partner-a:", error);
  } finally {
    process.exit(0);
  }
}

createBusinessPartner();