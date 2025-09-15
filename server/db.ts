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

// ENTERPRISE-GRADE CONNECTION POOLING FOR 100% PERFORMANCE
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 25, // povećan broj konekcija za enterprise load
  min: 2, // održava minimalne konekcije
  idleTimeoutMillis: 60000, // produžen idle timeout 
  connectionTimeoutMillis: 3000, // optimizovan connection timeout
  maxUses: 10000, // povećan broj korištenja konekcije
  allowExitOnIdle: false, 
  keepAlive: true,
  keepAliveInitialDelayMillis: 0, // instant keepalive
  statement_timeout: 30000, // 30s query timeout
  query_timeout: 30000, // 30s query timeout
  application_name: 'FrigoSistemAdmin_v2025' // identifikacija aplikacije
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
  
  // Prevent the error from causing uncaught exceptions
  // This is particularly important for Neon serverless connection issues
});

export const db = drizzle({ 
  client: pool, 
  schema,
  logger: process.env.NODE_ENV === 'development' // production-ready logging
});

// ENTERPRISE HEALTH CHECK & MONITORING
export async function checkDatabaseHealth(): Promise<{ healthy: boolean; responseTime: number; activeConnections: number }> {
  const startTime = Date.now();
  try {
    await pool.query('SELECT 1');
    const responseTime = Date.now() - startTime;
    const poolStats = pool.totalCount;
    
    return {
      healthy: true,
      responseTime,
      activeConnections: poolStats
    };
  } catch (error) {
    return {
      healthy: false,
      responseTime: Date.now() - startTime,
      activeConnections: 0
    };
  }
}
