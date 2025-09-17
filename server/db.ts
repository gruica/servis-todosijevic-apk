import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// HTTP-BASED NEON CONNECTION (Resilient & Reliable)
const sql = neon(process.env.DATABASE_URL);

export const db = drizzle({ 
  client: sql, 
  schema,
  logger: process.env.NODE_ENV === 'development' // production-ready logging
});

// Export sql client for raw queries
export { sql };

// Resilience guard for database initialization
export async function initializeDatabaseSafely(): Promise<boolean> {
  try {
    await sql('SELECT 1');
    console.log('✅ [DATABASE] HTTP connection established successfully');
    return true;
  } catch (error) {
    console.error('❌ [DATABASE] Initialization failed, but server will continue:', error);
    return false;
  }
}

// HEALTH CHECK & MONITORING (HTTP Driver Compatible)
export async function checkDatabaseHealth(): Promise<{ healthy: boolean; responseTime: number; activeConnections: number }> {
  const startTime = Date.now();
  try {
    await sql('SELECT 1');
    const responseTime = Date.now() - startTime;
    
    return {
      healthy: true,
      responseTime,
      activeConnections: 1 // HTTP connections are stateless
    };
  } catch (error) {
    return {
      healthy: false,
      responseTime: Date.now() - startTime,
      activeConnections: 0
    };
  }
}
