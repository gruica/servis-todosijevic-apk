import jwt from 'jsonwebtoken';

const secret = 'frigo-sistem-jwt-secret-key-2025';

// Podaci korisnika za Jelena (admin)
const payload = {
  userId: 10,
  username: 'jelena@frigosistemtodosijevic.me',
  role: 'admin'
};

const token = jwt.sign(payload, secret, { expiresIn: '30d' });
console.log('JWT Token:', token);