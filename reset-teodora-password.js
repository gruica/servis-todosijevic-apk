import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scryptAsync(password, salt, 64);
  return `${hash.toString('hex')}.${salt}`;
}

async function generateTeodoraPassword() {
  const password = process.env.TEODORA_NEW_PASSWORD || (() => {
    console.error('❌ SECURITY: TEODORA_NEW_PASSWORD environment variable is required');
    process.exit(1);
  })();
  const hashedPassword = await hashPassword(password);
  console.log(`UPDATE users SET password = '${hashedPassword}' WHERE username = 'teodora@frigosistemtodosijevic.com';`);
}

generateTeodoraPassword();