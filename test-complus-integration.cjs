// Test ComPlus integracije koristeći istu logiku kao u aplikaciji
const nodemailer = require('nodemailer');

async function testComplusIntegration() {
  console.log('🧪 Test ComPlus email integracije...');
  
  // Test da li environment varijabla postoji
  if (!process.env.SMTP_PASSWORD) {
    console.error('❌ SMTP_PASSWORD environment varijabla nije postavljena');
    return;
  }
  
  console.log('✅ SMTP_PASSWORD je dostupan');
  
  // Kreiraj transporter (ista konfiguracija kao u email-service.ts)
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
    // Testiraj konekciju
    console.log('🔗 Testiram SMTP konekciju...');
    await transporter.verify();
    console.log('✅ SMTP konekcija uspešna');
    
    // Test ComPlus email (simulira funkciju iz email-service.ts)
    const mailOptions = {
      from: 'info@frigosistemtodosijevic.com',
      to: 'gruica@frigosistemtodosijevic.com',
      subject: 'COMPLUS SERVIS ZAVRŠEN - Automatska Notifikacija #186',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0066cc;">ComPlus Servis Završen</h2>
          <p>Poštovani ComPlus timu,</p>
          <p>Obaveštavamo vas da je završen servis ComPlus uređaja.</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3>Detalji servisa:</h3>
            <p><strong>Servis ID:</strong> #186</p>
            <p><strong>Klijent:</strong> Rajko Radovic</p>
            <p><strong>Serviser:</strong> Test Serviser</p>
            <p><strong>Tip uređaja:</strong> Mašina za sušenje veša</p>
            <p><strong>Brend:</strong> Candy</p>
            <p><strong>Datum završetka:</strong> ${new Date().toLocaleDateString('sr-ME')}</p>
          </div>
          
          <div style="background-color: #e8f4f8; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3>Izvršeni rad:</h3>
            <p>Test završetka ComPlus servisa - automatska email notifikacija</p>
          </div>
          
          <p>Ovaj email je automatski generisan od strane Servis Todosijević sistema.</p>
          <p>Za dodatne informacije kontaktirajte nas na info@frigosistemtodosijevic.com</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="font-size: 12px; color: #666;">
            Servis Todosijević<br>
            Automatski Email Sistem<br>
            ComPlus Integracija
          </p>
        </div>
      `
    };
    
    console.log('📧 Šaljem ComPlus test email...');
    const result = await transporter.sendMail(mailOptions);
    
    console.log('✅ ComPlus email uspešno poslat!');
    console.log('📬 Poslat na: gruica@frigosistemtodosijevic.com');
    console.log('📨 Message ID:', result.messageId);
    console.log('🎯 ComPlus email sistem je spreman za produkciju!');
    
  } catch (error) {
    console.error('❌ Greška:', error.message);
    
    if (error.code === 'EAUTH') {
      console.error('🔐 Problem sa autentifikacijom - proverite SMTP kredencijale');
    } else if (error.code === 'ENOTFOUND') {
      console.error('🌐 Problem sa SMTP serverom - proverite host konfiguraciju');
    }
  }
}

testComplusIntegration();