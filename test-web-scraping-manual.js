// DIREKTAN TEST WEB SCRAPING SISTEMA
import jwt from 'jsonwebtoken';

async function testWebScraping() {
  try {
    // Generiši JWT token
    const secret = process.env.JWT_SECRET || 'fallback-secret';
    const payload = { userId: 10, username: 'admin', role: 'admin' };
    const token = jwt.sign(payload, secret, { expiresIn: '1h' });
    
    console.log('🚀 Pokretam test web scraping sistema...');
    
    const response = await fetch('https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/api/web-scraping/scrape', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('📊 WEB SCRAPING REZULTAT:');
    console.log(`  ✅ Uspešno: ${result.success}`);
    console.log(`  🆕 Novi delovi: ${result.newParts}`);
    console.log(`  🔄 Ažurirani delovi: ${result.updatedParts}`);
    console.log(`  ⏱️ Trajanje: ${result.duration}ms`);
    console.log(`  ❌ Greške: ${result.errors?.length || 0}`);
    
    if (result.errors?.length > 0) {
      console.log('🚨 GREŠKE:');
      result.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    return result;
    
  } catch (error) {
    console.error('💥 TEST GREŠKA:', error.message);
    return null;
  }
}

// Pokreni test
testWebScraping().then(result => {
  if (result && result.success) {
    console.log('🎉 Web scraping test USPEŠAN!');
    process.exit(0);
  } else {
    console.log('❌ Web scraping test NEUSPEŠAN!');
    process.exit(1);
  }
});