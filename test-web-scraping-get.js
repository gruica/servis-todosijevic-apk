// TEST WEB SCRAPING GET ENDPOINT
import jwt from 'jsonwebtoken';

async function testWebScrapingGET() {
  try {
    // Generiši JWT token
    const secret = process.env.JWT_SECRET || 'fallback-secret';
    const payload = { 
      userId: 10, 
      username: 'admin', 
      role: 'admin',
      fullName: 'Admin',
      id: 10
    };
    const token = jwt.sign(payload, secret, { expiresIn: '1h' });
    
    console.log('🚀 Testiram GET /api/web-scraping/scrape endpoint...');
    
    const response = await fetch('https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/api/web-scraping/scrape', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`📡 Response status: ${response.status} ${response.statusText}`);
    console.log(`📡 Response headers:`, [...response.headers.entries()]);
    
    const contentType = response.headers.get('content-type');
    console.log(`📡 Content-Type: ${contentType}`);
    
    if (!response.ok) {
      console.log(`❌ HTTP error: ${response.status}`);
      const text = await response.text();
      console.log(`❌ Response text:`, text.substring(0, 200));
      return;
    }
    
    if (contentType && contentType.includes('application/json')) {
      const result = await response.json();
      console.log('📊 WEB SCRAPING GET REZULTAT:');
      console.log(`  ✅ Uspešno: ${result.success}`);
      console.log(`  🆕 Novi delovi: ${result.newParts}`);
      console.log(`  🔄 Ažurirani delovi: ${result.updatedParts}`);
      console.log(`  ⏱️ Trajanje: ${result.duration}ms`);
      console.log(`  📝 Poruka: ${result.message}`);
      console.log(`  ❌ Greške: ${result.errors?.length || 0}`);
      
      if (result.errors?.length > 0) {
        console.log('🚨 GREŠKE:');
        result.errors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error}`);
        });
      }
      
      return result;
    } else {
      console.log('❌ Odgovor nije JSON:', contentType);
      const text = await response.text();
      console.log('❌ Text response:', text.substring(0, 300));
      return null;
    }
    
  } catch (error) {
    console.error('💥 TEST GREŠKA:', error.message);
    return null;
  }
}

// Pokreni test
testWebScrapingGET().then(result => {
  if (result && result.success) {
    console.log('🎉 Web scraping GET test USPEŠAN!');
    process.exit(0);
  } else {
    console.log('❌ Web scraping GET test NEUSPEŠAN!');
    process.exit(1);
  }
}).catch(error => {
  console.error('💥 Neočekivana greška:', error);
  process.exit(1);
});