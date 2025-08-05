const fs = require('fs');
const csv = require('csv-parser');
const { Pool } = require('pg');

// Database konfiguracija
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function importCandyCatalog() {
  console.log('🔄 Početak import-a Candy kataloga...');
  
  const client = await pool.connect();
  
  try {
    // Prvo pronađi Candy manufacturer ID
    const candyResult = await client.query("SELECT id FROM manufacturers WHERE name = 'Candy'");
    let candyManufacturerId;
    
    if (candyResult.rows.length === 0) {
      // Kreiraj Candy manufacturer ako ne postoji
      const insertManufacturer = await client.query(
        "INSERT INTO manufacturers (name, country, website) VALUES ('Candy', 'Italy', 'https://candy-home.com') RETURNING id"
      );
      candyManufacturerId = insertManufacturer.rows[0].id;
      console.log('✅ Kreiran novi Candy manufacturer sa ID:', candyManufacturerId);
    } else {
      candyManufacturerId = candyResult.rows[0].id;
      console.log('✅ Pronađen postojeći Candy manufacturer sa ID:', candyManufacturerId);
    }

    // Mapa kategorija za konverziju
    const categoryMap = {
      'washing-machine': 'washing-machine',
      'tumble-dryer': 'tumble-dryer', 
      'oven': 'oven',
      'fridge-freezer': 'fridge-freezer',
      'microwave': 'microwave',
      'cooker-hood': 'cooker-hood',
      'universal': 'universal'
    };

    let importedCount = 0;
    let errorCount = 0;
    const errors = [];

    // Čitaj CSV fajl
    const csvData = [];
    
    await new Promise((resolve, reject) => {
      fs.createReadStream('./candy-spare-parts-catalog.csv')
        .pipe(csv())
        .on('data', (row) => {
          csvData.push(row);
        })
        .on('end', () => {
          console.log(`📊 Učitano ${csvData.length} redova iz CSV fajla`);
          resolve();
        })
        .on('error', reject);
    });

    // Obradi svaki red
    for (const row of csvData) {
      try {
        // Mapiranje CSV kolona na bazu podataka
        const partData = {
          part_number: row['Part Number'],
          part_name: row['Part Name'],
          description: row['Description'],
          category: categoryMap[row['Category']] || 'universal',
          manufacturer_id: candyManufacturerId,
          compatible_models: row['Compatible Models'],
          price_eur: row['Price EUR'] ? parseFloat(row['Price EUR']) : null,
          price_gbp: row['Price GBP'] ? parseFloat(row['Price GBP']) : null,
          supplier_name: row['Supplier Name'],
          supplier_url: row['Supplier URL'],
          image_urls: row['Image URLs'] ? JSON.stringify([row['Image URLs']]) : null,
          availability: row['Availability'] === 'available' ? 'available' : 'out_of_stock',
          stock_level: row['Stock Level'] ? parseInt(row['Stock Level']) : 0,
          min_stock_level: row['Min Stock Level'] ? parseInt(row['Min Stock Level']) : 0,
          dimensions: row['Dimensions'],
          weight: row['Weight'],
          technical_specs: row['Technical Specs'],
          installation_notes: row['Installation Notes'],
          warranty_period: row['Warranty Period'],
          is_oem_part: row['Is OEM Part'] === 'true',
          alternative_part_numbers: row['Alternative Part Numbers'] ? JSON.stringify([row['Alternative Part Numbers']]) : null,
          source_type: 'import'
        };

        // Provjeri da li deo već postoji
        const existingPart = await client.query(
          'SELECT id FROM parts_catalog WHERE part_number = $1',
          [partData.part_number]
        );

        if (existingPart.rows.length > 0) {
          // Ažuriraj postojeći deo
          await client.query(`
            UPDATE parts_catalog SET 
              part_name = $1, description = $2, category = $3, 
              compatible_models = $4, price_eur = $5, price_gbp = $6,
              supplier_name = $7, supplier_url = $8, image_urls = $9,
              availability = $10, stock_level = $11, min_stock_level = $12,
              dimensions = $13, weight = $14, technical_specs = $15,
              installation_notes = $16, warranty_period = $17, is_oem_part = $18,
              alternative_part_numbers = $19, last_updated = NOW()
            WHERE part_number = $20
          `, [
            partData.part_name, partData.description, partData.category,
            partData.compatible_models, partData.price_eur, partData.price_gbp,
            partData.supplier_name, partData.supplier_url, partData.image_urls,
            partData.availability, partData.stock_level, partData.min_stock_level,
            partData.dimensions, partData.weight, partData.technical_specs,
            partData.installation_notes, partData.warranty_period, partData.is_oem_part,
            partData.alternative_part_numbers, partData.part_number
          ]);
          console.log(`🔄 Ažuriran deo: ${partData.part_number} - ${partData.part_name}`);
        } else {
          // Dodaj novi deo
          await client.query(`
            INSERT INTO parts_catalog (
              part_number, part_name, description, category, manufacturer_id,
              compatible_models, price_eur, price_gbp, supplier_name, supplier_url,
              image_urls, availability, stock_level, min_stock_level, dimensions,
              weight, technical_specs, installation_notes, warranty_period,
              is_oem_part, alternative_part_numbers, source_type
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
              $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
            )
          `, [
            partData.part_number, partData.part_name, partData.description, 
            partData.category, partData.manufacturer_id, partData.compatible_models,
            partData.price_eur, partData.price_gbp, partData.supplier_name, 
            partData.supplier_url, partData.image_urls, partData.availability,
            partData.stock_level, partData.min_stock_level, partData.dimensions,
            partData.weight, partData.technical_specs, partData.installation_notes,
            partData.warranty_period, partData.is_oem_part, partData.alternative_part_numbers,
            partData.source_type
          ]);
          console.log(`✅ Dodaj novi deo: ${partData.part_number} - ${partData.part_name}`);
        }

        importedCount++;
      } catch (error) {
        errorCount++;
        const errorMsg = `Greška pri import-u dela ${row['Part Number']}: ${error.message}`;
        console.error('❌', errorMsg);
        errors.push(errorMsg);
      }
    }

    // Finalni izveštaj
    console.log('\n=== IZVEŠTAJ IMPORT-A ===');
    console.log(`✅ Uspešno import-ovano: ${importedCount} delova`);
    console.log(`❌ Greške: ${errorCount}`);
    console.log(`📊 Candy Manufacturer ID: ${candyManufacturerId}`);
    
    if (errors.length > 0) {
      console.log('\n🔍 DETALJI GREŠAKA:');
      errors.forEach(error => console.log('  -', error));
    }

    // Provjeri finalno stanje
    const finalCount = await client.query('SELECT COUNT(*) FROM parts_catalog WHERE manufacturer_id = $1', [candyManufacturerId]);
    console.log(`🎯 Ukupno Candy delova u bazi: ${finalCount.rows[0].count}`);

  } catch (error) {
    console.error('💥 Kritična greška:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Pokreni import
importCandyCatalog().catch(console.error);