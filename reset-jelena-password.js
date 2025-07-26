import { db } from './server/database.js';
import { users } from './shared/schema.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

async function resetJelenaPassword() {
  try {
    console.log('🔄 Resetovanje lozinke za Jelenu...');
    
    const password = 'jelena123';
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    const hashedPassword = hash + '.' + salt;
    
    const result = await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.username, 'jelena@frigosistemtodosijevic.me'))
      .returning();
    
    if (result.length > 0) {
      console.log('✅ Lozinka za Jelenu uspešno resetovana na: jelena123');
    } else {
      console.log('❌ Korisnik Jelena nije pronađen');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Greška pri resetovanju lozinke:', error);
    process.exit(1);
  }
}

resetJelenaPassword();