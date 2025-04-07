import { db } from "../server/db";
import { users } from "../shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function fixPasswords() {
  try {
    console.log("Začinjem ažuriranje lozinki...");
    
    // Dohvati sve korisnike
    const allUsers = await db.select().from(users);
    console.log(`Pronađeno ${allUsers.length} korisnika za proveru`);
    
    // Broji korisnike kojima je ažurirana lozinka
    let updatedCount = 0;
    
    for (const user of allUsers) {
      console.log(`Provera korisnika: ${user.username}`);
      
      // Proveri da li je lozinka već validno heširana (ima format 'hash.salt')
      const parts = user.password.split('.');
      if (parts.length !== 2 || parts[0].length < 32 || parts[1].length < 16) {
        // Lozinka nije heširana ili nije u ispravnom formatu
        console.log(`  Lozinka za korisnika ${user.username} nije ispravno heširana, ažuriram...`);
        
        let newPassword;
        
        // Ako je korisnik jelena@frigosistemtodosijevic.me, admin@frigosistemtodosijevic.me ili gruica@frigosistemtodosijevic.com
        // postaviti lozinku na admin123
        if (user.username === 'jelena@frigosistemtodosijevic.com' ||
            user.username === 'admin@frigosistemtodosijevic.me' ||
            user.username === 'gruica@frigosistemtodosijevic.com') {
          newPassword = await hashPassword('admin123');
          console.log(`  Postavljanje lozinke 'admin123' za korisnika ${user.username}`);
        } else {
          // Za ostale korisnike, iskoristi njihovo postojeće ime kao osnovu za lozinku
          const defaultPassword = 'admin123';
          newPassword = await hashPassword(defaultPassword);
          console.log(`  Postavljanje podrazumevane lozinke za korisnika ${user.username}`);
        }
        
        // Ažuriraj lozinku u bazi
        await db
          .update(users)
          .set({ password: newPassword })
          .where(eq(users.id, user.id));
        
        updatedCount++;
      } else {
        console.log(`  Lozinka za korisnika ${user.username} je već ispravno heširana`);
      }
    }
    
    console.log(`\nUspešno ažurirano ${updatedCount} korisnika.`);
    
    // Dodaj korisnika jelena@frigosistemtodosijevic.me ako ne postoji
    const jelenaUser = await db
      .select()
      .from(users)
      .where(eq(users.username, 'jelena@frigosistemtodosijevic.me'));
    
    if (jelenaUser.length === 0) {
      console.log('\nDodavanje korisnika jelena@frigosistemtodosijevic.me...');
      const hashedPassword = await hashPassword('admin123');
      
      await db.insert(users).values({
        username: 'jelena@frigosistemtodosijevic.me',
        password: hashedPassword,
        fullName: 'Jelena Todosijević',
        role: 'admin'
      });
      
      console.log('Korisnik jelena@frigosistemtodosijevic.me uspešno dodat!');
    }
    
    console.log('\nAžuriranje lozinki završeno!');
    
  } catch (error) {
    console.error('Greška pri ažuriranju lozinki:', error);
  } finally {
    process.exit(0);
  }
}

fixPasswords();