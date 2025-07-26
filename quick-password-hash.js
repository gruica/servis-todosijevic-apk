import crypto from 'crypto';

const password = 'jelena123';
const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.scryptSync(password, salt, 64).toString('hex');
const hashedPassword = hash + '.' + salt;

console.log('Hashed password for jelena123:', hashedPassword);