const jwt = require('jsonwebtoken');

// Kreiram business partner token
const businessPartnerToken = jwt.sign(
  { userId: 1, username: 'test@business.com', role: 'business_partner' },
  'AdamEva230723@',
  { expiresIn: '1h' }
);

console.log('🔑 Business Partner Token:');
console.log(businessPartnerToken);

// Testiram i admin token koji treba da radi sa business rutama
const adminToken = jwt.sign(
  { userId: 10, username: 'jelena@frigosistemtodosijevic.me', role: 'admin' },
  'AdamEva230723@',
  { expiresIn: '1h' }
);

console.log('\n🔑 Admin Token:');
console.log(adminToken);
