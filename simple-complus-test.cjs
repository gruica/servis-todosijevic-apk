// Jednostavan test ComPlus funkcionalnosti kroz direktno prilagođavanje baze
const { Client } = require('pg');

async function testComplusEmailDirect() {
  console.log('🧪 Direktni test ComPlus email funkcionalnosti...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    console.log('📊 Povezan sa bazom podataka');
    
    // 1. Proveravamo da li servis 186 pripada Candy brendu (ComPlus)
    const result = await client.query(`
      SELECT s.id, s.status, c.full_name as client_name, m.name as manufacturer, ac.name as category
      FROM services s 
      JOIN clients c ON s.client_id = c.id 
      JOIN appliances a ON s.appliance_id = a.id 
      JOIN manufacturers m ON a.manufacturer_id = m.id
      JOIN appliance_categories ac ON a.category_id = ac.id
      WHERE s.id = 186
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ Servis 186 nije pronađen');
      return;
    }
    
    const service = result.rows[0];
    console.log('📋 Servis detalji:', service);
    
    // Proveravamo da li je ComPlus brend (Candy, Electrolux, Elica itd.)
    const complusBrands = ['candy', 'electrolux', 'elica', 'hoover', 'turbo air'];
    const isComplusBrand = complusBrands.includes(service.manufacturer.toLowerCase());
    
    console.log(`🏷️ Brend: ${service.manufacturer}`);
    console.log(`✅ ComPlus brend: ${isComplusBrand ? 'DA' : 'NE'}`);
    
    if (isComplusBrand) {
      console.log('📧 Ovaj servis bi trebalo da aktivira ComPlus email kada se završi!');
      
      // Simuliramo završetak servisa
      console.log('🔄 Simuliramo završetak servisa...');
      
      await client.query(`
        UPDATE services 
        SET status = 'completed', 
            completed_date = CURRENT_TIMESTAMP,
            technician_notes = 'ComPlus email test - direktno iz baze'
        WHERE id = 186
      `);
      
      console.log('✅ Servis označen kao završen u bazi');
      console.log('📧 Za automatsko slanje email-a koristite web aplikaciju PUT /api/services/186');
      
    } else {
      console.log('⚠️ Ovo nije ComPlus brend, neće se poslati email');
    }
    
  } catch (error) {
    console.error('❌ Greška:', error.message);
  } finally {
    await client.end();
  }
}

testComplusEmailDirect();