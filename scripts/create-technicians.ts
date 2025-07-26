import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import { eq } from "drizzle-orm";
import * as schema from "../shared/schema";

neonConfig.webSocketConstructor = ws;

// Koristimo users i technicians iz schema
const { users, technicians } = schema;

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function createTechnicians() {
  // Connect to the database
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle({ client: pool, schema });
  
  try {
    // Fetch all technicians
    const allTechnicians = await db.select().from(technicians);
    console.log(`Found ${allTechnicians.length} technicians`);
    
    const defaultPassword = await hashPassword("serviser123");
    
    // Create user accounts for each technician
    for (const technician of allTechnicians) {
      // Skip if no email
      if (!technician.email) {
        console.log(`Skipping technician ${technician.fullName} (ID ${technician.id}) - no email`);
        continue;
      }
      
      // Check if user already exists
      const [existingUser] = await db.select().from(users).where(eq(users.username, technician.email));
      
      if (existingUser) {
        // Update existing user
        console.log(`User for technician ${technician.fullName} already exists, updating...`);
        await db.update(users)
          .set({ 
            role: "technician",
            fullName: technician.fullName,
            technicianId: technician.id
          })
          .where(eq(users.id, existingUser.id));
        console.log(`User updated for technician ${technician.fullName} (ID ${technician.id})`);
      } else {
        // Create new user
        await db.insert(users).values({
          username: technician.email,
          password: defaultPassword,
          fullName: technician.fullName,
          role: "technician",
          technicianId: technician.id
        });
        console.log(`User created for technician ${technician.fullName} (ID ${technician.id})`);
      }
    }
    
    console.log("All technician accounts have been created or updated");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    // Drizzle handles connection pooling automatically
    console.log("Database operations completed.");
  }
}

createTechnicians();