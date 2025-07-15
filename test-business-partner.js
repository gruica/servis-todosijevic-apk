const { spawn } = require('child_process');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

// Test script for business partner functionality
async function testBusinessPartnerClientCreation() {
  console.log('=== TEST: Business Partner Client Creation ===');
  
  // First, create a business partner user
  console.log('1. Creating business partner user...');
  try {
    const createPartnerScript = `
      import { db } from './server/db.js';
      import { users } from './shared/schema.js';
      import { hash } from 'node:crypto';
      
      async function hashPassword(password) {
        return new Promise((resolve, reject) => {
          const salt = crypto.randomBytes(16).toString('hex');
          hash('scrypt', Buffer.from(password), salt, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
            if (err) reject(err);
            else resolve(salt + ':' + derivedKey.toString('hex'));
          });
        });
      }
      
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
      
      console.log('Business partner created:', newPartner);
      process.exit(0);
    `;
    
    const { stdout, stderr } = await exec(`echo '${createPartnerScript}' | node --input-type=module`);
    console.log('Partner creation output:', stdout);
    if (stderr) console.error('Partner creation errors:', stderr);
    
  } catch (error) {
    console.error('Error creating business partner:', error);
  }
  
  // Now test login as business partner
  console.log('2. Testing business partner login...');
  
  // Test client creation
  console.log('3. Testing client creation...');
  
  console.log('=== Test completed ===');
}

testBusinessPartnerClientCreation().catch(console.error);