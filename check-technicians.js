import { db } from './server/db.ts';
import { users } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

async function checkTechnicians() {
  console.log('🔍 Proverava podatke o serviserima...\n');
  
  const technicians = await db.select().from(users).where(eq(users.role, 'technician'));
  
  console.log('📋 Serviseri u bazi:');
  technicians.forEach(tech => {
    console.log(`ID: ${tech.id} | ${tech.fullName} | ${tech.username} | Verifikovan: ${tech.isVerified}`);
  });
  
  process.exit(0);
}

checkTechnicians().catch(console.error);