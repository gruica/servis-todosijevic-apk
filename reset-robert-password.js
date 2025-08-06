import scrypt from 'scrypt';
import { db } from './server/db.js';
import { users } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function resetRobertPassword() {
  try {
    console.log("Resetting Robert's password to 'pass123'");
    
    // Generate hash for pass123
    const hash = await scrypt.hash('pass123', 10);
    console.log('New hash:', hash);
    
    // Update database
    await db.update(users)
      .set({ password: hash })
      .where(eq(users.username, 'robert.ivezic@tehnoplus.me'));
    
    console.log('✅ Password successfully reset!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

resetRobertPassword();