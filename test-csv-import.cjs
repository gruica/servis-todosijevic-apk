const fs = require('fs');
const jwt = require('jsonwebtoken');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testCSVImport() {
  try {
    // Korišćenje ispravnog JWT tokena sa userId poljem za admin korisnika (ID 10)
    const token = process.env.ADMIN_JWT_TOKEN || (() => {
      console.error('❌ SECURITY: ADMIN_JWT_TOKEN environment variable is required');
      process.exit(1);
    })();

    // Kreiranje FormData sa CSV datotekom
    const form = new FormData();
    const csvContent = fs.readFileSync('candy-expanded-parts-catalog.csv');
    form.append('csvFile', csvContent, {
      filename: 'candy-expanded-parts-catalog.csv',
      contentType: 'text/csv'
    });

    console.log('🔄 Pokušavam uvoz CSV datoteke...');
    console.log('📄 Datoteka: candy-expanded-parts-catalog.csv');
    console.log('👤 Korisnik: jelena@frigosistemtodosijevic.me (admin)');

    // Slanje zahteva za uvoz
    const response = await fetch('http://localhost:5000/api/admin/spare-parts-catalog/import-csv', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...form.getHeaders()
      },
      body: form
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    
    console.log('\n✅ UVOZ ZAVRŠEN USPEŠNO!');
    console.log('📊 REZULTATI:');
    console.log(`   • Uvezeno: ${result.imported} rezervnih delova`);
    console.log(`   • Preskočeno: ${result.skipped} postojećih delova`);
    
    if (result.errors && result.errors.length > 0) {
      console.log(`   • Greške: ${result.errors.length}`);
      console.log('\n❌ DETALJI GREŠAKA:');
      result.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    console.log(`\n💬 Poruka: ${result.message}`);

    // Provera statistika nakon uvoza
    console.log('\n🔍 Proveravam statistike kataloga...');
    const statsResponse = await fetch('http://localhost:5000/api/admin/spare-parts-catalog/stats', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      console.log('📈 STATISTIKE KATALOGA:');
      console.log(`   • Ukupno delova: ${stats.totalParts}`);
      console.log(`   • Dostupno: ${stats.availableParts}`);
      console.log(`   • Kategorije: ${stats.categoriesCount}`);
      console.log(`   • Proizvođači: ${stats.manufacturersCount}`);
    }

  } catch (error) {
    console.error('\n❌ GREŠKA TOKOM UVOZA:');
    console.error(`   ${error.message}`);
    process.exit(1);
  }
}

testCSVImport();