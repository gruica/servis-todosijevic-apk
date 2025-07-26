const fs = require('fs');

async function testAdminLoginAndCatalogImport() {
  const baseUrl = 'https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev';
  
  try {
    // 1. Admin login
    console.log('🔐 Ulogovavanje kao admin...');
    const loginResponse = await fetch(`${baseUrl}/api/jwt-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin@frigosistemtodosijevic.me',
        password: 'admin123'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Admin login uspešan, token:', loginData.token.substring(0, 50) + '...');
    
    const authHeaders = {
      'Authorization': `Bearer ${loginData.token}`,
      'Content-Type': 'application/json'
    };
    
    // 2. Test CSV import API endpoint
    console.log('\n📊 Testiranje CSV import endpoint-a...');
    
    // Read the existing CSV file
    const csvContent = fs.readFileSync('candy-spare-parts-catalog.csv', 'utf8');
    console.log('📁 CSV datoteka učitana, veličina:', csvContent.length, 'karaktera');
    
    // Create FormData for file upload
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('csvFile', csvContent, {
      filename: 'candy-spare-parts-catalog.csv',
      contentType: 'text/csv'
    });
    
    // Import CSV
    const importResponse = await fetch(`${baseUrl}/api/admin/spare-parts-catalog/import-csv`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${loginData.token}`,
        ...formData.getHeaders()
      },
      body: formData
    });
    
    console.log('📤 CSV import response status:', importResponse.status);
    const importResult = await importResponse.text();
    console.log('📤 CSV import response:', importResult);
    
    // 3. Check catalog content
    console.log('\n📋 Provera kataloga nakon import-a...');
    const catalogResponse = await fetch(`${baseUrl}/api/admin/spare-parts-catalog`, {
      headers: authHeaders
    });
    
    if (catalogResponse.ok) {
      const catalog = await catalogResponse.json();
      console.log('✅ Katalog uspešno učitan:', catalog.length, 'delova');
      
      // Show first few parts
      catalog.slice(0, 3).forEach((part, index) => {
        console.log(`  ${index + 1}. ${part.partName} (${part.partNumber}) - ${part.manufacturer}`);
      });
    } else {
      console.log('❌ Greška pri učitavanju kataloga:', catalogResponse.status);
    }
    
    // 4. Test search functionality
    console.log('\n🔍 Testiranje search funkcionalnosti...');
    const searchResponse = await fetch(`${baseUrl}/api/admin/spare-parts-catalog/search?q=filter`, {
      headers: authHeaders
    });
    
    if (searchResponse.ok) {
      const searchResults = await searchResponse.json();
      console.log('✅ Search rezultati:', searchResults.length, 'pronađenih delova');
    } else {
      console.log('❌ Greška pri pretragzi:', searchResponse.status);
    }
    
    // 5. Test statistics
    console.log('\n📈 Testiranje statistika...');
    const statsResponse = await fetch(`${baseUrl}/api/admin/spare-parts-catalog/stats`, {
      headers: authHeaders
    });
    
    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      console.log('✅ Statistike:', JSON.stringify(stats, null, 2));
    } else {
      console.log('❌ Greška pri učitavanju statistika:', statsResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Greška:', error.message);
  }
}

testAdminLoginAndCatalogImport();