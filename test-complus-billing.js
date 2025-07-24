#!/usr/bin/env node

// TEST COMPLUS BILLING SISTEM
// Testira fakturisanje garancijskih servisa za Complus brendove po mesecima

import fs from 'fs';

const BASE_URL = 'https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev';

async function testComplusBilling() {
  console.log('🧾 TEST COMPLUS BILLING SISTEM');
  console.log('='.repeat(50));

  try {
    // Čitaj admin token
    const token = fs.readFileSync('admin_token.txt', 'utf8').trim();
    console.log('✅ Admin token učitan');

    // Test za različite brendove i mesece
    const testCases = [
      { brand: 'Candy', month: '07', year: '2025' },
      { brand: 'Electrolux', month: '07', year: '2025' },
      { brand: 'Elica', month: '07', year: '2025' }
    ];

    for (const testCase of testCases) {
      console.log(`\n📊 Test ${testCase.brand} za ${testCase.month}/${testCase.year}:`);
      
      const params = new URLSearchParams(testCase);
      const response = await fetch(`${BASE_URL}/api/admin/billing/complus?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ ${data.totalServices} servisa pronađeno`);
        console.log(`   💰 Ukupna vrednost: ${data.totalCost.toFixed(2)}€`);
        
        if (data.services.length > 0) {
          console.log('   📋 Servisi:');
          data.services.slice(0, 3).forEach(service => {
            console.log(`      • #${service.serviceNumber} - ${service.clientName} (${service.clientCity})`);
          });
          if (data.services.length > 3) {
            console.log(`      ... i još ${data.services.length - 3} servisa`);
          }
        }
      } else {
        console.log(`   ❌ Greška: ${response.status} - ${response.statusText}`);
      }
    }

    console.log('\n🎯 BILLING SISTEM TESTIRAN!');
    console.log('📍 Admin panel stranica: /admin/complus-billing');

  } catch (error) {
    console.error('❌ Greška tokom testiranja:', error.message);
  }
}

// Pokretanje testa
testComplusBilling().catch(console.error);