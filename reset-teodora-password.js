import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scryptAsync(password, salt, 64);
  return `${hash.toString('hex')}.${salt}`;
}

async function generateTeodoraPassword() {
  const hashedPassword = await hashPassword('Teodora123');
  console.log(`UPDATE users SET password = '${hashedPassword}' WHERE username = 'teodora@frigosistemtodosijevic.com';`);
}

generateTeodoraPassword();