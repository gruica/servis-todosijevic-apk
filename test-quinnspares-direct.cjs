const fetch = require('node-fetch');
const cheerio = require('cheerio');

// Direktan test Quinnspares stranice da vidim šta sadrži
async function testQuinnsparesDirect() {
  try {
    console.log('🌐 Testiram direktno Quinnspares.com...');
    
    const response = await fetch('https://www.quinnspares.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 15000
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      console.error('❌ Stranica nije dostupna:', response.statusText);
      return;
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    console.log('📄 HTML length:', html.length);
    console.log('📄 Title:', $('title').text());
    
    // Pronađi linkove za proizvođače
    console.log('\n🔍 Tražim manufacturer/brand linkove...');
    const manufacturerLinks = [];
    
    $('a').each((_, element) => {
      const href = $(element).attr('href');
      const text = $(element).text().toLowerCase();
      
      if (href && (
        href.includes('manufacturer') || 
        href.includes('brand') || 
        text.includes('candy') || 
        text.includes('beko') || 
        text.includes('electrolux')
      )) {
        manufacturerLinks.push({
          text: text.trim(),
          href: href
        });
      }
    });
    
    console.log('🏭 Pronađeni manufacturer linkovi:', manufacturerLinks.slice(0, 10));
    
    // Pronađi product linkove
    console.log('\n🔍 Tražim product linkove...');
    const productLinks = [];
    
    $('a[href*="product"], a[href*="part"], .product-link, .part-link').each((_, element) => {
      const href = $(element).attr('href');
      const text = $(element).text().trim();
      
      if (href && text) {
        productLinks.push({
          text: text,
          href: href
        });
      }
    });
    
    console.log('🛒 Pronađeni product linkovi:', productLinks.slice(0, 10));
    
    // Proveri postojanje search funkcionalnosti
    console.log('\n🔍 Proveavam search funkcionalnost...');
    const searchForms = [];
    
    $('form, input[name*="search"], input[name*="q"]').each((_, element) => {
      const action = $(element).attr('action') || $(element).closest('form').attr('action');
      const name = $(element).attr('name');
      const type = $(element).attr('type');
      
      searchForms.push({
        tag: element.name,
        action: action,
        name: name,
        type: type
      });
    });
    
    console.log('🔎 Search forms/inputs:', searchForms);
    
    // Test search URL
    if (searchForms.length > 0) {
      console.log('\n🧪 Testiram search za "candy"...');
      const searchResponse = await fetch('https://www.quinnspares.com/search?q=candy', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www.quinnspares.com/'
        },
        timeout: 15000
      });
      
      console.log('🔍 Search response status:', searchResponse.status);
      
      if (searchResponse.ok) {
        const searchHtml = await searchResponse.text();
        const search$ = cheerio.load(searchHtml);
        
        const searchResults = [];
        search$('a[href*="product"], .search-result, .product').each((_, element) => {
          const href = search$(element).attr('href');
          const text = search$(element).text().trim();
          
          if (href && text && text.length > 0) {
            searchResults.push({
              text: text.substring(0, 100),
              href: href
            });
          }
        });
        
        console.log('🎯 Search rezultati (prvih 5):', searchResults.slice(0, 5));
      }
    }
    
  } catch (error) {
    console.error('❌ Greška:', error.message);
    console.error('Stack:', error.stack);
  }
}

testQuinnsparesDirect();