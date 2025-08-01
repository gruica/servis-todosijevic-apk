// Debug script za proveru trenutnih kredencijala
console.log('🔐 PROVERA KREDENCIJALA');
console.log('=====================');

console.log('EMAIL_USER:', process.env.EMAIL_USER || '[NIJE POSTAVLJENO]');
console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '[POSTAVLJENO - ' + process.env.EMAIL_PASSWORD.length + ' karaktera]' : '[NIJE POSTAVLJENO]');
console.log('SMTP_PASSWORD:', process.env.SMTP_PASSWORD ? '[POSTAVLJENO - ' + process.env.SMTP_PASSWORD.length + ' karaktera]' : '[NIJE POSTAVLJENO]');

console.log('\n💡 ALTERNATIVNI TESTOVI');
console.log('====================');

// Test sa različitim username formatima
const nodemailer = require('nodemailer');

const possibleUsers = [
  process.env.EMAIL_USER,
  'info@frigosistemtodosijevic.com',
  'info',
  'admin@frigosistemtodosijevic.com',
  'admin'
];

const possiblePasswords = [
  process.env.EMAIL_PASSWORD,
  process.env.SMTP_PASSWORD
];

async function testCredentials() {
  for (const user of possibleUsers.filter(Boolean)) {
    for (const pass of possiblePasswords.filter(Boolean)) {
      console.log(`🧪 Testiram: ${user} / ${pass ? '[' + pass.length + ' kar]' : 'null'}`);
      
      try {
        const transporter = nodemailer.createTransport({
          host: 'mail.frigosistemtodosijevic.com',
          port: 465,
          secure: true,
          auth: { user, pass },
          tls: { rejectUnauthorized: false },
          connectionTimeout: 10000
        });

        await transporter.verify();
        console.log(`✅ USPEŠNO! User: ${user}, Pass: [${pass.length} karaktera]`);
        return { user, pass };
        
      } catch (error) {
        console.log(`❌ Neuspešno: ${error.message}`);
      }
    }
  }
  
  console.log('\n💔 Nijedna kombinacija nije uspešna');
  return null;
}

testCredentials();