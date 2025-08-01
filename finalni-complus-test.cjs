// Finalni test ComPlus email funkcionalnosti sa ispravnim EMAIL_PASSWORD kredencijalima
const nodemailer = require('nodemailer');

async function testComplPlusEmail() {
  console.log('🎯 FINALNI COMPLUS EMAIL TEST');
  console.log('=============================');
  
  const user = process.env.EMAIL_USER || 'info@frigosistemtodosijevic.com';
  const pass = process.env.EMAIL_PASSWORD || '';
  
  console.log(`📧 Email: ${user}`);
  console.log(`🔐 Password: ${pass ? '[POSTAVLJENA - ' + pass.length + ' karaktera]' : '[NIJE POSTAVLJENA]'}`);
  console.log('');

  try {
    // Kreiraj transporter sa radnim konfiguracijama koje su testirane
    const transporter = nodemailer.createTransport({
      host: 'mail.frigosistemtodosijevic.com',
      port: 465,
      secure: true,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    });

    console.log('🔍 Verifikujem SMTP konekciju...');
    await transporter.verify();
    console.log('✅ SMTP konekcija je uspešna!');
    
    console.log('📤 Šaljem ComPlus test email...');
    
    // Šalje test email koji simulira ComPlus notifikaciju
    await transporter.sendMail({
      from: user,
      to: 'gruica@frigosistemtodosijevic.com', // Test adresa umesto servis@complus.me
      subject: 'COMPLUS SERVIS ZAVRŠEN - Test Email #187',
      text: `Poštovani ComPlus timu,

Ovo je test email koji potvrđuje funkcionalnost ComPlus notifikacije.

Detalji servisa:
- Servis ID: #187
- Klijent: Marko Marković  
- Serviser: Test Tehnčar
- Tip uređaja: Frižider
- Brend: Beko
- Datum završetka: ${new Date().toLocaleDateString('sr-ME')}

Izvršeni rad:
Test ComPlus email funkcionalnosti sa novim EMAIL_PASSWORD kredencijalima - USPEŠNO!

NAPOMENA: U produkciji, ovaj email bi bio automatski poslat na servis@complus.me kada se završavaju ComPlus servisi.

Servis Todosijević - Automatski Email Sistem
ComPlus Integracija Test - Potpuno funkcionalan!`,
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #28a745; color: white; padding: 15px; border-radius: 5px; text-align: center;">
          <h2 style="margin: 0;">✅ COMPLUS SERVIS ZAVRŠEN</h2>
          <p style="margin: 5px 0 0 0;">Automatsko obaveštenje - Test funkcionalnosti</p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 15px 0;">
          <h3 style="color: #28a745;">Detalji servisa</h3>
          <p><strong>Servis ID:</strong> #187</p>
          <p><strong>Klijent:</strong> Marko Marković</p>
          <p><strong>Serviser:</strong> Test Tehničar</p>
          <p><strong>Tip uređaja:</strong> Frižider</p>
          <p><strong>Brend:</strong> Beko</p>
          <p><strong>Datum završetka:</strong> ${new Date().toLocaleDateString('sr-ME')}</p>
        </div>

        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px;">
          <p style="margin: 0; color: #155724;">
            <strong>✅ EMAIL SISTEM FUNKCIONALAN:</strong> ComPlus email notifikacije rade ispravno sa novim EMAIL_PASSWORD kredencijalima!
          </p>
        </div>

        <p style="margin-top: 20px;">
          <strong>Napomena:</strong> U produkciji, ovaj email bi bio automatski poslat na <strong>servis@complus.me</strong> kada se završavaju ComPlus servisi.
        </p>
        
        <hr style="border: 1px solid #ddd; margin: 20px 0;">
        <p style="font-size: 12px; color: #666; text-align: center;">
          Frigo Sistem Todosijević - Automatski Email Sistem<br>
          ComPlus Integracija Test - ${new Date().toLocaleString()}
        </p>
      </div>`
    });
    
    console.log('🎉 ComPlus test email USPEŠNO poslat!');
    console.log('✅ Email sistem je SPREMAN za ComPlus notifikacije!');
    console.log('💡 U produkciji će email ići na servis@complus.me automatski');
    
    return true;
    
  } catch (error) {
    console.log('❌ Greška pri slanju ComPlus test email-a:', error.message);
    return false;
  }
}

testComplPlusEmail();