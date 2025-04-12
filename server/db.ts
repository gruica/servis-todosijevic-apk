import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Poboljšana konfiguracija pool-a
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20, // maksimalan broj konekcija
  idleTimeoutMillis: 30000, // timeout za neaktivne konekcije
  connectionTimeoutMillis: 2000, // timeout za nove konekcije
});

// Event handleri za pool
pool.on('connect', () => {
  console.log('Baza: Nova konekcija uspostavljena');
});

pool.on('error', (err) => {
  console.error('Baza: Greška u pool-u:', err);
});

export const db = drizzle({ 
  client: pool, 
  schema,
  logger: true // uključi logovanje upita
});
