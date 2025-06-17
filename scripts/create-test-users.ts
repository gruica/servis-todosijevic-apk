import { db } from "../server/db";
import { users } from "../shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { sql } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function createTestUsers() {
  try {
    console.log("Kreiranje test korisnika za sve uloge...");
    
    // Brisanje postojećih test korisnika
    await db.execute(sql`
      DELETE FROM users WHERE username IN ('testadmin', 'testtech', 'testcustomer', 'testpartner');
    `);
    
    const testUsers = [
      {
        username: "testadmin",
        password: await hashPassword("admin123"),
        fullName: "Test Administrator",
        role: "admin",
        email: "admin@test.com",
        phone: "067111111",
        isVerified: true
      },
      {
        username: "testtech", 
        password: await hashPassword("tech123"),
        fullName: "Test Serviser",
        role: "technician",
        email: "tech@test.com",
        phone: "067222222",
        isVerified: true
      },
      {
        username: "testcustomer",
        password: await hashPassword("customer123"),
        fullName: "Test Klijent",
        role: "customer", 
        email: "customer@test.com",
        phone: "067333333",
        address: "Test adresa 1",
        city: "Podgorica",
        isVerified: true
      },
      {
        username: "testpartner",
        password: await hashPassword("partner123"),
        fullName: "Test Poslovni Partner",
        role: "business_partner",
        email: "partner@test.com", 
        phone: "067444444",
        companyName: "Test Kompanija d.o.o.",
        companyId: "12345678",
        isVerified: true
      }
    ];
    
    for (const user of testUsers) {
      await db.execute(sql`
        INSERT INTO users (username, password, full_name, role, email, phone, address, city, company_name, company_id, is_verified, registered_at, verified_at, verified_by)
        VALUES (${user.username}, ${user.password}, ${user.fullName}, ${user.role}, ${user.email}, ${user.phone}, ${user.address || null}, ${user.city || null}, ${user.companyName || null}, ${user.companyId || null}, ${user.isVerified}, NOW(), NOW(), 1)
      `);
      
      console.log(`✓ ${user.role}: ${user.username} / ${user.username.replace('test', '')}123`);
    }
    
    console.log("\n=== TEST KREDENCIJALI ===");
    console.log("Administrator: testadmin / admin123");
    console.log("Serviser: testtech / tech123");
    console.log("Klijent: testcustomer / customer123");
    console.log("Poslovni partner: testpartner / partner123");
    
  } catch (error) {
    console.error("Greška pri kreiranju test korisnika:", error);
  } finally {
    process.exit(0);
  }
}

createTestUsers();