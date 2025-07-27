const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

// Generate JWT token using environment variables
const secret = process.env.JWT_SECRET;
if (!secret) {
  console.error('❌ JWT_SECRET environment variable is required');
  process.exit(1);
}

const payload = {
  userId: 10,
  username: 'jelena@frigosistemtodosijevic.me',
  role: 'admin',
  fullName: 'Admin',
  id: 10
};

const token = jwt.sign(payload, secret, { expiresIn: '1h' });

console.log('🔑 Koristim validni JWT Token:', token.substring(0, 50) + '...');

// Test scraping API poziv
async function testWebScraping() {
  try {
    console.log('🚀 Pokretanje web scraping testa...');
    
    const response = await fetch('https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/api/admin/web-scraping/sources/1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        maxPages: 3,
        targetManufacturers: ['Candy', 'Beko', 'Electrolux']
      }),
      timeout: 60000
    });
    
    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
    
    // Uvek učitaj response kao text prvo
    const responseText = await response.text();
    console.log('📄 Response text (first 500 chars):', responseText.substring(0, 500));
    
    if (!response.ok) {
      console.error('❌ Error response:', responseText);
      return;
    }
    
    // Pokušaj JSON parsing samo ako izgleda kao JSON
    let result;
    if (responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
      result = JSON.parse(responseText);
    } else {
      console.error('❌ Response nije JSON format. Možda je HTML error stranica.');
      return;
    }
    console.log('✅ Scraping rezultat:', JSON.stringify(result, null, 2));
    
    // Proveri broj delova u bazi nakon scraping-a
    await checkPartsCount();
    
  } catch (error) {
    console.error('❌ Test greška:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Proveri broj delova u katalog
async function checkPartsCount() {
  try {
    console.log('\n📊 Proverava broj delova u katalogu...');
    
    const response = await fetch('https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/api/admin/spare-parts-catalog/stats', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    if (response.ok) {
      const stats = await response.json();
      console.log('📈 Stats pre scraping-a:', stats);
    }
    
  } catch (error) {
    console.error('❌ Greška pri proveri stats:', error.message);
  }
}

// Pokreni test
testWebScraping();