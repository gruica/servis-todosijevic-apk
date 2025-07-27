const fetch = require('node-fetch');

// Produkcijski test sa stvarnim Quinnspares.com web scraping-om
async function testLiveQuinnsparesScaping() {
  try {
    console.log('🌐 Pokretanje live Quinnspares.com web scraping testa...');
    
    const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEwLCJ1c2VybmFtZSI6ImplbGVuYUBmcmlnb3Npc3RlbXRvZG9zaWpldmljLm1lIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzUzNjAzMTE3LCJleHAiOjE3NTYxOTUxMTd9.P3XNM-ya1PsJzqNxKfW4beZSlAwHGcQSM4dVFowqp2Q';
    
    // Test sa Candy brendom - poznata kategorija sa autentičnim delovima
    const scrapingConfig = {
      manufacturer: 'Candy',
      urls: [
        'https://www.quinnspares.com/candy/c-1022.html'
      ],
      maxPages: 2, // Ograniči na 2 stranice za test
      maxItems: 10 // Maksimalno 10 delova za test
    };
    
    console.log('📋 Scraping konfiguracija:');
    console.log(`   Proizvođač: ${scrapingConfig.manufacturer}`);
    console.log(`   URL: ${scrapingConfig.urls[0]}`);
    console.log(`   Maksimalno stranica: ${scrapingConfig.maxPages}`);
    console.log(`   Maksimalno delova: ${scrapingConfig.maxItems}`);
    
    console.log('\n🚀 Pokretanje Puppeteer web scraping procesa...');
    
    const startTime = Date.now();
    
    const scrapingResponse = await fetch('https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/api/web-scraping/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${JWT_TOKEN}`
      },
      body: JSON.stringify(scrapingConfig),
      timeout: 120000 // 2 minuta timeout za web scraping
    });
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);
    
    console.log(`\n⏱️  Scraping završen za ${duration} sekundi`);
    
    console.log(`📡 Response status: ${scrapingResponse.status}`);
    console.log(`📡 Response headers:`, Object.fromEntries(scrapingResponse.headers.entries()));
    
    const responseText = await scrapingResponse.text();
    console.log(`📡 Response body preview: ${responseText.substring(0, 200)}...`);
    
    if (!scrapingResponse.ok) {
      console.error(`❌ SCRAPING GREŠKA: ${scrapingResponse.status} ${responseText}`);
      return;
    }
    
    let scrapingResult;
    try {
      scrapingResult = JSON.parse(responseText);
    } catch (parseError) {
      console.error(`❌ JSON PARSE GREŠKA: ${parseError.message}`);
      console.error(`Response nije JSON: ${responseText.substring(0, 500)}`);
      return;
    }
    console.log('\n📊 SCRAPING REZULTAT:');
    console.log(`✅ Uspešno scraping-ovan: ${scrapingResult.scrapedParts?.length || 0} delova`);
    console.log(`📦 Dodano u katalog: ${scrapingResult.addedParts?.length || 0} delova`);
    console.log(`⚠️  Duplikati preskočeni: ${scrapingResult.duplicates?.length || 0} delova`);
    console.log(`❌ Greške: ${scrapingResult.errors?.length || 0} delova`);
    
    // Prikaz prvih nekoliko scraping-ovanih delova
    if (scrapingResult.scrapedParts && scrapingResult.scrapedParts.length > 0) {
      console.log('\n🔍 PRVI NEKOLIKO SCRAPING-OVANIH DELOVA:');
      scrapingResult.scrapedParts.slice(0, 3).forEach((part, index) => {
        console.log(`\n${index + 1}. ${part.partName}`);
        console.log(`   Kataloški broj: ${part.partNumber}`);
        console.log(`   Cena: £${part.priceGbp}`);
        console.log(`   Kategorija: ${part.category}`);
        console.log(`   Kompatibilni modeli: ${part.compatibleModels?.join(', ') || 'N/A'}`);
        console.log(`   URL: ${part.supplierUrl}`);
      });
    }
    
    // Prikaz grešaka ako postoje
    if (scrapingResult.errors && scrapingResult.errors.length > 0) {
      console.log('\n⚠️  GREŠKE TOKOM SCRAPING-A:');
      scrapingResult.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    // Finalna validacija kataloga
    console.log('\n📈 FINALNA VALIDACIJA KATALOGA:');
    const statsResponse = await fetch('https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/api/admin/spare-parts-catalog/stats', {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`
      }
    });
    
    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      console.log(`📦 Ukupno delova u katalogu: ${stats.totalParts}`);
      console.log(`📈 Dostupnih delova: ${stats.availableParts}`);
      console.log(`🏭 Broj proizvođača: ${stats.manufacturersCount}`);
      console.log(`📂 Broj kategorija: ${stats.categoriesCount}`);
      console.log(`🏷️  Po proizvođačima:`, stats.byManufacturer);
    }
    
    console.log('\n🎉 LIVE QUINNSPARES WEB SCRAPING TEST ZAVRŠEN!');
    
  } catch (error) {
    console.error('❌ KRITIČNA GREŠKA:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testLiveQuinnsparesScaping();