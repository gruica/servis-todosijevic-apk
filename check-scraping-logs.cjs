const fetch = require('node-fetch');

// Proveri web scraping logs da vidim što se desilo
async function checkScrapingLogs() {
  try {
    const token = process.env.ADMIN_JWT_TOKEN || (() => {
      console.error('❌ SECURITY: ADMIN_JWT_TOKEN environment variable is required');
      process.exit(1);
    })();
    
    console.log('📋 Proverava web scraping logs...');
    
    const response = await fetch('https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/api/admin/web-scraping/logs', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      return;
    }

    const logs = await response.json();
    console.log('📊 Scraping logs:', JSON.stringify(logs, null, 2));
    
    // Proveraj i sources
    console.log('\n🌍 Proverava web scraping sources...');
    const sourcesResponse = await fetch('https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/api/admin/web-scraping/sources', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (sourcesResponse.ok) {
      const sources = await sourcesResponse.json();
      console.log('🔗 Sources:', JSON.stringify(sources, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Greška:', error.message);
  }
}

checkScrapingLogs();