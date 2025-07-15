import { db } from '../server/db';
import { users } from '../shared/schema';
import { hash } from 'node:crypto';
import { promisify } from 'util';

const hashFn = promisify(hash);

async function hashPassword(password: string): Promise<string> {
  const salt = Math.random().toString(36).substring(2, 15);
  const hashedPassword = await hashFn('scrypt', Buffer.from(password), Buffer.from(salt), { N: 16384, r: 8, p: 1 });
  return salt + ':' + hashedPassword.toString('hex');
}

async function createTestBusinessPartner() {
  try {
    console.log('Creating test business partner...');
    
    const hashedPassword = await hashPassword('partner123');
    
    const newPartner = await db.insert(users).values({
      username: 'partner@test.com',
      password: hashedPassword,
      fullName: 'Test Partner',
      role: 'business_partner',
      email: 'partner@test.com',
      companyName: 'Test Company',
      isVerified: true,
      verifiedAt: new Date(),
      verifiedBy: 10
    }).returning();
    
    console.log('✅ Business partner created successfully:', newPartner);
    
    // Also create a regular business partner for production testing
    const hashedPassword2 = await hashPassword('poslovni123');
    
    const productionPartner = await db.insert(users).values({
      username: 'poslovni@partner.com',
      password: hashedPassword2,
      fullName: 'Poslovni Partner',
      role: 'business_partner',
      email: 'poslovni@partner.com',
      companyName: 'Poslovni Partner DOO',
      isVerified: true,
      verifiedAt: new Date(),
      verifiedBy: 10
    }).returning();
    
    console.log('✅ Production business partner created:', productionPartner);
    
    console.log('\n=== Login credentials ===');
    console.log('Test Partner: partner@test.com / partner123');
    console.log('Production Partner: poslovni@partner.com / poslovni123');
    
  } catch (error) {
    console.error('❌ Error creating business partner:', error);
  }
}

createTestBusinessPartner().catch(console.error);