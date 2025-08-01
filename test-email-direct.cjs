// Direktan test email funkcionalnosti
const nodemailer = require('nodemailer');

async function testEmailDirect() {
  console.log('🧪 Direktan test email konfiguracije...');
  
  const config = {
    host: process.env.EMAIL_HOST || 'mail.frigosistemtodosijevic.com',
    port: parseInt(process.env.EMAIL_PORT) || 465,
    secure: true, // Za port 465
    auth: {
      user: 'admin@frigosistemtodosijevic.com',
      pass: process.env.SMTP_PASSWORD
    },
    tls: {
      rejectUnauthorized: false
    }
  };
  
  console.log('📧 Konfiguracija:', {
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.auth.user,
    hasPassword: !!config.auth.pass
  });
  
  try {
    console.log('🔨 Kreiranje transportera...');
    const transporter = nodemailer.createTransport(config);
    
    console.log('🔍 Verifikacija transportera...');
    await transporter.verify();
    console.log('✅ Transporter je uspešno verifikovan!');
    
    console.log('📮 Slanje test email-a...');
    const result = await transporter.sendMail({
      from: config.auth.user,
      to: 'vladimir.jela.84@gmail.com',
      subject: 'Test Email - ComPlus Sistem',
      text: 'Ovo je test email iz ComPlus sistema.',
      html: '<h1>Test Email</h1><p>Ovo je test email iz ComPlus sistema.</p>'
    });
    
    console.log('✅ Email uspešno poslat!');
    console.log('📬 MessageId:', result.messageId);
    
  } catch (error) {
    console.error('❌ Greška:', error.message);
    console.error('🔍 Kod greške:', error.code);
    console.error('🔍 Detalji:', error);
  }
}

testEmailDirect();