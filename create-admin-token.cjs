const jwt = require('jsonwebtoken');

// Koristimo postojeći JWT secret iz environment-a
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('JWT_SECRET environment variable is not set');
  process.exit(1);
}

// Kreiraj token za admin korisnika (ID 10) sa ispravnom strukturom (userId umesto id)
const token = jwt.sign(
  { 
    userId: 10, 
    username: 'jelena@frigosistemtodosijevic.me', 
    role: 'admin' 
  },
  JWT_SECRET,
  { expiresIn: '1h' }
);

console.log('Admin JWT Token:');
console.log(token);