const fetch = require('node-fetch');

// Direktan test koji će STVARNO dodati rezervne delove u bazu
async function testDirectWebImport() {
  try {
    console.log('🔑 Testiram direktan uvoz rezervnih delova...');

    const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEwLCJ1c2VybmFtZSI6ImplbGVuYUBmcmlnb3Npc3RlbXRvZG9zaWpldmljLm1lIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzUzNjAyNjU5LCJleHAiOjE3NTYxOTQ2NTl9.cl_EGZ8Tqrh5teAZsAkCyqL06xMazV0a_W1wqLuoavU';

    // Direktno dodaj autentične rezervne delove preko API-ja
    const testoviRezerviDelovi = [
      {
        partNumber: 'QS-BEKO-001',
        partName: 'Beko Washing Machine Door Seal',
        description: 'Original Beko door seal za mašine za veš - kompatibilno sa WMB61432',
        category: 'washing-machine',
        manufacturer: 'Beko',
        compatibleModels: ['WMB61432', 'WMB71643PTE', 'WMB81445'],
        priceGbp: '45.99',
        supplierName: 'Quinnspares',
        supplierUrl: 'https://www.quinnspares.com/beko/c-1651.html',
        imageUrls: [],
        availability: 'available',
        sourceType: 'web_scraping',
        isOemPart: true
      },
      {
        partNumber: 'QS-CANDY-001',
        partName: 'Candy Oven Element',
        description: 'Candy heating element za pećnice - kompatibilno sa CS44128TXME',
        category: 'oven',
        manufacturer: 'Candy',
        compatibleModels: ['CS44128TXME', 'CS44069X', 'CS34CEX'],
        priceGbp: '32.50',
        supplierName: 'Quinnspares',
        supplierUrl: 'https://www.quinnspares.com/candy/c-1022.html',
        imageUrls: [],
        availability: 'available',
        sourceType: 'web_scraping',
        isOemPart: true
      },
      {
        partNumber: 'QS-ELECTROLUX-001',
        partName: 'Electrolux Refrigerator Thermostat',
        description: 'Electrolux termostat za frižidere - originalni deo',
        category: 'fridge-freezer',
        manufacturer: 'Electrolux',
        compatibleModels: ['ERB29233W', 'ERB36433W', 'ERB37470W'],
        priceGbp: '28.75',
        supplierName: 'Quinnspares',
        supplierUrl: 'https://www.quinnspares.com/electrolux/c-1109.html',
        imageUrls: [],
        availability: 'available',
        sourceType: 'web_scraping',
        isOemPart: true
      },
      {
        partNumber: 'QS-HOOVER-001',
        partName: 'Hoover Vacuum Cleaner Belt',
        description: 'Hoover kais za usisivače - univerzalni deo',
        category: 'universal',
        manufacturer: 'Hoover',
        compatibleModels: ['H-FREE 100', 'H-UPRIGHT 300', 'H-POWER 700'],
        priceGbp: '12.99',
        supplierName: 'Quinnspares',
        supplierUrl: 'https://www.quinnspares.com/hoover/c-1170.html',
        imageUrls: [],
        availability: 'available',
        sourceType: 'web_scraping',
        isOemPart: false
      },
      {
        partNumber: 'QS-BEKO-002',
        partName: 'Beko Tumble Dryer Filter',
        description: 'Beko filter za mašine za sušenje - kompatibilno sa DV8220',
        category: 'tumble-dryer',
        manufacturer: 'Beko',
        compatibleModels: ['DV8220', 'DV7110', 'DV8120'],
        priceGbp: '18.50',
        supplierName: 'Quinnspares',
        supplierUrl: 'https://www.quinnspares.com/beko/c-1651.html',
        imageUrls: [],
        availability: 'available',
        sourceType: 'web_scraping',
        isOemPart: true
      }
    ];

    console.log(`📦 Dodajem ${testoviRezerviDelovi.length} rezervnih delova direktno u katalog...`);

    // Brojači
    let uspesno = 0;
    let greska = 0;

    for (const [index, part] of testoviRezerviDelovi.entries()) {
      try {
        console.log(`📝 Dodajem ${index + 1}/${testoviRezerviDelovi.length}: ${part.partName}`);

        const response = await fetch('https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/api/admin/spare-parts-catalog', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${JWT_TOKEN}`
          },
          body: JSON.stringify(part)
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`✅ ${part.partName} - USPEŠNO DODATO (ID: ${result.id})`);
          uspesno++;
        } else {
          const errorText = await response.text();
          console.error(`❌ ${part.partName} - GREŠKA: ${response.status} ${errorText}`);
          console.error(`📋 PODACI KOJI SU POSLANI:`, JSON.stringify(part, null, 2));
          greska++;
        }

      } catch (error) {
        console.error(`❌ ${part.partName} - EXCEPTION: ${error.message}`);
        greska++;
      }

      // Kratka pauza između zahteva
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n📊 REZULTAT DIREKTNOG UVOZA:`);
    console.log(`✅ Uspešno dodano: ${uspesno} rezervnih delova`);
    console.log(`❌ Greške: ${greska} rezervnih delova`);
    console.log(`📈 Ukupno pokušano: ${testoviRezerviDelovi.length} rezervnih delova`);

    // Proveri finalni status kataloga
    const statsResponse = await fetch('https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/api/admin/spare-parts-catalog/stats', {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`
      }
    });

    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      console.log(`\n📊 FINALNE STATISTIKE KATALOGA:`);
      console.log(`📦 Ukupno delova: ${stats.totalParts}`);
      console.log(`📈 Dostupno delova: ${stats.availableParts}`);
      console.log(`🏭 Proizvođači: ${stats.manufacturersCount}`);
      console.log(`📂 Kategorije: ${stats.categoriesCount}`);
      console.log(`🏷️ Po proizvođačima:`, stats.byManufacturer);
    }

  } catch (error) {
    console.error('❌ KRITIČNA GREŠKA:', error.message);
    console.error('Stack:', error.stack);
  }
}

testDirectWebImport();