import jwt from 'jsonwebtoken';

// Kreiranje JWT tokena za admin korisnika
const adminPayload = {
  userId: 38,
  username: 'admin',
  role: 'admin'
};

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  console.error('🚨 SECURITY ERROR: JWT_SECRET environment variable is required');
  throw new Error('JWT_SECRET environment variable must be set');
})();

const token = jwt.sign(adminPayload, JWT_SECRET, { expiresIn: '30d' });

console.log('🔑 ADMIN JWT TOKEN:');
console.log(token);
console.log('\n📋 Token details:');
console.log('User ID:', adminPayload.userId);
console.log('Username:', adminPayload.username);
console.log('Role:', adminPayload.role);
console.log('Expires in: 30 days');