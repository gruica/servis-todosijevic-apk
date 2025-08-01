// Direktan test SMTP konfiguracija bez korišćenja postojeći EmailService
const nodemailer = require('nodemailer');

async function testSmtpConfigs() {
  console.log('🔧 DIREKTAN SMTP TEST');
  console.log('=====================');
  
  const user = process.env.EMAIL_USER || 'info@frigosistemtodosijevic.com';
  const pass = process.env.SMTP_PASSWORD || '';
  
  console.log(`📧 Email: ${user}`);
  console.log(`🔐 Password: ${pass ? '[POSTAVLJENA]' : '[NIJE POSTAVLJENA]'}`);
  console.log('');

  // Različite SMTP konfiguracije za testiranje
  const smtpConfigs = [
    { name: 'SSL 465', host: 'mail.frigosistemtodosijevic.com', port: 465, secure: true },
    { name: 'TLS 587', host: 'mail.frigosistemtodosijevic.com', port: 587, secure: false },
    { name: 'Port 25', host: 'mail.frigosistemtodosijevic.com', port: 25, secure: false },
    { name: 'STARTTLS 587', host: 'mail.frigosistemtodosijevic.com', port: 587, secure: false, requireTLS: true },
    // Dodatne konfiguracije za testiranje
    { name: 'SSL 465 (bez auth)', host: 'mail.frigosistemtodosijevic.com', port: 465, secure: true, auth: false },
    { name: 'Port 2525', host: 'mail.frigosistemtodosijevic.com', port: 2525, secure: false }
  ];

  for (const config of smtpConfigs) {
    console.log(`🧪 Testiram: ${config.name} (${config.host}:${config.port})`);
    
    try {
      const transportConfig = {
        host: config.host,
        port: config.port,
        secure: config.secure,
        tls: { rejectUnauthorized: false },
        connectionTimeout: 15000,
        greetingTimeout: 10000,
        socketTimeout: 15000
      };

      // Dodaj auth samo ako nije eksplicitno false
      if (config.auth !== false) {
        transportConfig.auth = { user, pass };
      }

      if (config.requireTLS) {
        transportConfig.requireTLS = true;
      }

      const transporter = nodemailer.createTransport(transportConfig);

      // Pokušaj verifikaciju
      console.log(`  🔍 Verifikujem konekciju...`);
      await transporter.verify();
      console.log(`  ✅ Verifikacija uspešna za ${config.name}!`);
      
      // Pokušaj poslati test email
      console.log(`  📤 Šaljem test email...`);
      await transporter.sendMail({
        from: user,
        to: 'gruica@frigosistemtodosijevic.com',
        subject: `SMTP Test - ${config.name} - ${new Date().toLocaleString()}`,
        text: `Test email poslat pomoću ${config.name} konfiguracije.\n\nDetalji:\n- Host: ${config.host}\n- Port: ${config.port}\n- Secure: ${config.secure}\n- Vreme: ${new Date().toLocaleString()}\n\nAko ste primili ovaj email, znači da ${config.name} konfiguracija RADI!`
      });
      
      console.log(`  🎉 Email uspešno poslat pomoću ${config.name}!`);
      console.log(`  🏆 POBEDNIČKE POSTAVKE: Host=${config.host}, Port=${config.port}, Secure=${config.secure}`);
      console.log('');
      
      process.exit(0); // Izađi čim nađemo radnu konfiguraciju
      
    } catch (error) {
      console.log(`  ❌ ${config.name} neuspešan: ${error.message}`);
    }
    
    console.log('');
  }

  console.log('💔 Nijedna SMTP konfiguracija nije uspešna');
  console.log('🔧 Predlozi:');
  console.log('1. Proverite SMTP_PASSWORD u Secrets tab-u');
  console.log('2. Kontaktirajte hosting provajdera za SMTP postavke');
  console.log('3. Proverite da li email nalog postoji i da je aktivan');
}

testSmtpConfigs();