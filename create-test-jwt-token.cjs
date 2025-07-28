const jwt = require('jsonwebtoken');

console.log('Creating JWT token for Gruica with current environment JWT_SECRET...');

// Debug: Show if JWT_SECRET exists
if (process.env.JWT_SECRET) {
  console.log(`✅ JWT_SECRET exists and is ${process.env.JWT_SECRET.length} characters long`);
} else {
  console.log('❌ JWT_SECRET not found in environment');
  process.exit(1);
}

// Kreira JWT token za Gruicu - corrected payload structure for JWT middleware
const payload = {
  userId: 12,  // Changed from 'id' to 'userId' to match JWTPayload interface
  username: 'gruica@frigosistemtodosijevic.com',
  role: 'technician',
  iat: Math.floor(Date.now() / 1000)
};

const token = jwt.sign(payload, process.env.JWT_SECRET);

console.log('🔑 JWT Token created successfully:');
console.log(token);
console.log('\n🧾 Token payload:', payload);

// Verifikuj token odmah
try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log('\n✅ Token verification successful:', decoded);
} catch (error) {
  console.log('\n❌ Token verification failed:', error.message);
}