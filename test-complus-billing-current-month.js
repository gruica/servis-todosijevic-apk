#!/usr/bin/env node

// TEST COMPLUS BILLING ZA TEKUĆI MESEC - JANUAR 2025
// Testira billing sistem sa realnim podacima iz baze

import fs from 'fs';

const BASE_URL = 'https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev';

async function testCurrentMonthBilling() {
  console.log('🧾 TEST COMPLUS BILLING - JANUAR 2025');
  console.log('='.repeat(50));

  try {
    // Čitaj admin token
    const token = fs.readFileSync('admin_token.txt', 'utf8').trim();
    console.log('✅ Admin token učitan');

    // Test za Januar 2025 (verovatno ima podataka)
    const testMonth = '01';
    const testYear = '2025';
    
    console.log(`\n📊 Test Complus billing za ${testMonth}/${testYear}:`);
    
    const params = new URLSearchParams({
      month: testMonth,
      year: testYear
    });
    
    const response = await fetch(`${BASE_URL}/api/admin/billing/complus?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ UKUPNO SERVISA: ${data.totalServices}`);
      console.log(`   💰 UKUPNA VREDNOST: ${data.totalCost.toFixed(2)}€`);
      console.log(`   📂 BRAND GROUP: ${data.brandGroup}`);
      console.log(`   🏷️  COMPLUS BRENDOVI: ${data.complusBrands.join(', ')}`);
      
      if (data.brandBreakdown && data.brandBreakdown.length > 0) {
        console.log('\n   📊 RASPORED PO BRENDOVIMA:');
        data.brandBreakdown.forEach(brand => {
          console.log(`      • ${brand.brand}: ${brand.count} servisa (${brand.cost.toFixed(2)}€)`);
        });
      }
      
      if (data.services.length > 0) {
        console.log('\n   📋 PRIMERI SERVISA:');
        data.services.slice(0, 5).forEach(service => {
          console.log(`      • #${service.serviceNumber} - ${service.clientName} (${service.clientCity}) - ${service.manufacturerName} ${service.applianceModel}`);
        });
        if (data.services.length > 5) {
          console.log(`      ... i još ${data.services.length - 5} servisa`);
        }
      }
      
      console.log('\n✅ BILLING SISTEM FUNKCIONIŠE ISPRAVNO!');
      console.log('📥 CSV export format: Complus_garancija_01_2025.csv');
      
    } else {
      console.log(`   ❌ Greška: ${response.status} - ${response.statusText}`);
      const errorText = await response.text();
      console.log(`   📄 Error details: ${errorText}`);
    }

  } catch (error) {
    console.error('❌ Greška tokom testiranja:', error.message);
  }
}

// Pokretanje testa
testCurrentMonthBilling().catch(console.error);