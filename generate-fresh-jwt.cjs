const jwt = require('jsonwebtoken');

// Kreiranje novog JWT tokena za admin korisnika 
const payload = {
  userId: 10,
  username: "jelena@frigosistemtodosijevic.me", 
  role: "admin",
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 dana
};

const secret = process.env.JWT_SECRET || 'frigo-sistem-jwt-secret-key-2025';
const token = jwt.sign(payload, secret);

console.log('Novi admin JWT token (valid 30 dana):');
console.log(token);
console.log('\nPayload:');
console.log(payload);