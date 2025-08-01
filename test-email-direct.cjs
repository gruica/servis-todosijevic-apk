// Test direktnog slanja email-a koristeći nodemailer
const nodemailer = require('nodemailer');

async function sendTestEmail() {
  console.log('Testiram ComPlus email funkcionalnost...');
  
  // SMTP konfiguracija (ista kao u email-service.ts)
  const transporter = nodemailer.createTransport({
    host: 'mail.frigosistemtodosijevic.com',
    port: 465,
    secure: true,
    auth: {
      user: 'info@frigosistemtodosijevic.com',
      pass: process.env.SMTP_PASSWORD
    }
  });
  
  try {
    // Test email za ComPlus notifikaciju
    const mailOptions = {
      from: 'info@frigosistemtodosijevic.com',
      to: 'gruica@frigosistemtodosijevic.com',
      subject: 'TEST: ComPlus Servis Završen - Automatska Notifikacija',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0066cc;">ComPlus Email Test - Uspešno!</h2>
          <p>Poštovani,</p>
          <p>Ovo je test email koji potvrđuje da ComPlus email sistem radi ispravno.</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Servis ID:</strong> #186 (Test)</p>
            <p><strong>Klijent:</strong> Rajko Radovic</p>
            <p><strong>Uređaj:</strong> Mašina za sušenje veša</p>
            <p><strong>Brend:</strong> Candy (ComPlus)</p>
            <p><strong>Serviser:</strong> Test Serviser</p>
            <p><strong>Izvršeni rad:</strong> Test završetka ComPlus servisa - email notifikacija</p>
          </div>
          
          <p>Email sistem je konfigurisan i spreman za slanje automatskih notifikacija na servis@complus.me kada se završavaju servisi ComPlus brendova (Candy, Electrolux, Elica, Hoover, Turbo Air).</p>
          
          <p>Srdačan pozdrav,<br>Servis Todosijević - Automatski Email Sistem</p>
        </div>
      `
    };
    
    console.log('Šaljem test email...');
    await transporter.sendMail(mailOptions);
    console.log('✅ Test email uspešno poslat na gruica@frigosistemtodosijevic.com!');
    console.log('📧 ComPlus email sistem je spreman za produkciju');
    
  } catch (error) {
    console.error('❌ Greška pri slanju email-a:', error.message);
  }
}

sendTestEmail();