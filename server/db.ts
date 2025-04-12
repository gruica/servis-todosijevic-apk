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

// Poboljšana konfiguracija pool-a s dodatnim parametrima za stabilnost
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20, // maksimalan broj konekcija
  idleTimeoutMillis: 30000, // timeout za neaktivne konekcije 
  connectionTimeoutMillis: 5000, // produžen timeout za nove konekcije
  maxUses: 7500, // ograničen broj korištenja konekcije prije recikliranja
  allowExitOnIdle: false, // ne dozvoli izlaz dok postoje idle konekcije
  keepAlive: true, // koristi TCP keepalive
  keepAliveInitialDelayMillis: 30000 // delay za keepalive
});

// Event handleri za pool s poboljšanim logovanjem i rukovanjem greškama
pool.on('connect', () => {
  console.log('Baza: Nova konekcija uspostavljena');
});

pool.on('error', (err: any) => {
  console.error('Baza: Greška u pool-u:', err);
  
  // Dodatni detalji za dijagnostiku
  if (err.code === '57P01') {
    console.error('Baza: Došlo je do prekida konekcije. Ponovno ću se povezati.');
  } else if (err.code === '08006' || err.code === '08001' || err.code === '08004') {
    console.error('Baza: Greška konekcije. Provjerite mrežnu vezu i postavke baze.');
  }
});

export const db = drizzle({ 
  client: pool, 
  schema,
  logger: true // uključi logovanje upita
});
