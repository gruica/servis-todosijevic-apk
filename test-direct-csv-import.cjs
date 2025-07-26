const fs = require('fs');

async function testDirectCsvImport() {
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
    console.log('✅ Admin login uspešan');
    
    // 2. Read CSV and parse manually
    console.log('\n📁 Učitavanje CSV datoteke...');
    const csvContent = fs.readFileSync('candy-spare-parts-catalog.csv', 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    console.log('📊 CSV sadrži', lines.length, 'linija');
    
    // Proper CSV parsing function
    function parseCSVLine(line) {
      const result = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim()); // Add the last field
      return result;
    }
    
    // Parse CSV header
    const header = parseCSVLine(lines[0]);
    console.log('📋 Header kolone:', header);
    
    // Parse data rows
    const dataRows = lines.slice(1);
    console.log('📈 Data redova:', dataRows.length);
    
    // 3. Convert to JSON and import directly through API
    const authHeaders = {
      'Authorization': `Bearer ${loginData.token}`,
      'Content-Type': 'application/json'
    };
    
    let successCount = 0;
    let errorCount = 0;
    
    console.log('\n🔄 Importovanje delova jedan po jedan...');
    
    for (let i = 0; i < dataRows.length; i++) { // Importujem sve delove
      const row = dataRows[i];
      const values = parseCSVLine(row);
      
      if (values.length >= 5) {
        const partData = {
          partNumber: values[0]?.trim() || `CANDY-${Date.now()}-${i}`,
          partName: values[1]?.trim() || 'Nepoznat deo',
          description: values[2]?.trim() || '',
          category: values[3]?.trim() || 'washing-machine',
          manufacturer: values[4]?.trim() || 'Candy',
          compatibleModels: values[5] ? values[5].split(';').map(m => m.trim()) : [],
          priceEur: values[6]?.trim() || null,
          supplierName: values[8]?.trim() || 'Complus',
          availability: 'available',
          isOemPart: values[19]?.toLowerCase() === 'true',
          sourceType: 'manual'
        };
        
        try {
          const createResponse = await fetch(`${baseUrl}/api/admin/spare-parts-catalog`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(partData)
          });
          
          if (createResponse.ok) {
            const result = await createResponse.json();
            console.log(`✅ ${i+1}. Uspešno kreiran: ${partData.partName} (ID: ${result.id})`);
            successCount++;
          } else {
            const error = await createResponse.text();
            console.log(`❌ ${i+1}. Greška: ${error}`);
            errorCount++;
          }
        } catch (error) {
          console.log(`❌ ${i+1}. Mrežna greška: ${error.message}`);
          errorCount++;
        }
        
        // Pauza između zahteva
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`\n📊 Rezultat: ${successCount} uspešno, ${errorCount} greška`);
    
    // 4. Proverim ukupan katalog
    console.log('\n📋 Finalna provera kataloga...');
    const catalogResponse = await fetch(`${baseUrl}/api/admin/spare-parts-catalog`, {
      headers: authHeaders
    });
    
    if (catalogResponse.ok) {
      const catalog = await catalogResponse.json();
      console.log('✅ Ukupno delova u katalogu:', catalog.length);
      
      // Prikaži poslednje dodane
      catalog.slice(-3).forEach((part, index) => {
        console.log(`  ${catalog.length - 2 + index}. ${part.partName} (${part.partNumber})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Glavna greška:', error.message);
  }
}

testDirectCsvImport();