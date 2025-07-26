import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET || (() => {
  throw new Error('JWT_SECRET environment variable is required');
})();

// Podaci korisnika za Jelena (admin)
const payload = {
  userId: 10,
  username: 'jelena@frigosistemtodosijevic.me',
  role: 'admin'
};

const token = jwt.sign(payload, secret, { expiresIn: '30d' });
console.log('JWT Token:', token);