const jwt = require('jsonwebtoken');

// Kreiranje test JWT tokena za admin korisnika
const token = jwt.sign(
  { userId: 10, username: 'jelena@frigosistemtodosijevic.me', role: 'admin' },
  process.env.JWT_SECRET || 'frigo-sistem-jwt-secret-key-2025'
);

console.log('Test delete servisa ID: 127');
console.log('JWT Token kreiran');

// Test DELETE zahtev
fetch('http://localhost:5000/api/admin/services/127', {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
}).then(response => {
  console.log('HTTP Status:', response.status);
  return response.json();
}).then(data => {
  console.log('Response data:', data);
}).catch(error => {
  console.error('Greška:', error);
});