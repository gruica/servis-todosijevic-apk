import crypto from 'crypto';

const password = process.env.PASSWORD_TO_HASH || (() => {
  console.error('❌ SECURITY: PASSWORD_TO_HASH environment variable is required');
  process.exit(1);
})();
const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.scryptSync(password, salt, 64).toString('hex');
const hashedPassword = hash + '.' + salt;

console.log('Hashed password for jelena123:', hashedPassword);