import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
import { scryptSync, randomBytes } from "crypto";

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hashedPassword = scryptSync(password, salt, 64).toString('hex');
  return `${hashedPassword}.${salt}`;
}

async function createTestTechnician() {
  try {
    console.log("Creating test technician account...");
    
    // Proverim da li korisnik već postoji
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.username, "test@serviser.com"));
    
    if (existingUser.length > 0) {
      console.log("Test technician already exists, updating password...");
      
      const hashedPassword = await hashPassword("test123");
      await db
        .update(users)
        .set({
          password: hashedPassword,
          role: "technician",
          technicianId: 1,
          fullName: "Test Serviser",
          email: "test@serviser.com",
          isVerified: true,
          verifiedAt: new Date()
        })
        .where(eq(users.username, "test@serviser.com"));
      
      console.log("Test technician updated successfully");
    } else {
      console.log("Creating new test technician...");
      
      const hashedPassword = await hashPassword("test123");
      await db
        .insert(users)
        .values({
          username: "test@serviser.com",
          password: hashedPassword,
          role: "technician",
          technicianId: 1,
          fullName: "Test Serviser",
          email: "test@serviser.com",
          isVerified: true,
          verifiedAt: new Date()
        });
      
      console.log("Test technician created successfully");
    }
    
    console.log("Test technician account ready:");
    console.log("Username: test@serviser.com");
    console.log("Password: test123");
    
  } catch (error) {
    console.error("Error creating test technician:", error);
  }
}

createTestTechnician();