import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import { eq } from "drizzle-orm";
import * as schema from "../shared/schema";

neonConfig.webSocketConstructor = ws;

// Користимо users из schema
const { users } = schema;

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function createAdmin() {
  const username = process.argv[2] || "admin@example.com";
  const password = process.argv[3] || "admin123";
  const fullName = process.argv[4] || "Administrator";
  const role = process.argv[5] || "admin";
  
  console.log(`Creating user with username: ${username} and role: ${role}`);
  
  // Connect to the database
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle({ client: pool, schema });
  
  try {
    // Hash the password
    const hashedPassword = await hashPassword(password);
    
    // Check if user already exists
    const [existingUser] = await db.select().from(users).where(eq(users.username, username));
    
    if (existingUser) {
      // Update existing user
      console.log(`User ${username} already exists, updating password...`);
      await db.update(users)
        .set({ 
          password: hashedPassword,
          role: role,
          fullName: fullName
        })
        .where(eq(users.id, existingUser.id));
      console.log("User updated successfully");
    } else {
      // Create new user
      await db.insert(users).values({
        username,
        password: hashedPassword,
        fullName,
        role
      });
      console.log("User created successfully");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pool.end();
  }
}

createAdmin();