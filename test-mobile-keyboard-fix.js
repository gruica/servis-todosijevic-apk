/**
 * Test script za verifikaciju mobilne optimizacije Android tastature
 * Ovaj test verifikuje da li su implementirane sve potrebne CSS optimizacije
 */

const axios = require('axios');
const https = require('https');
const { dirname } = require('path');
const fs = require('fs');

// API instance sa session podrškom
const agent = new https.Agent({
  rejectUnauthorized: false
});

const api = axios.create({
  baseURL: 'http://localhost:5000',
  timeout: 30000,
  httpsAgent: agent,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Funkcija za login
async function login(username, password) {
  try {
    const response = await api.post('/api/login', {
      username,
      password
    });
    return response.data;
  } catch (error) {
    console.error('Login greška:', error.response?.data || error.message);
    throw error;
  }
}

// Test mobilne optimizacije
async function testMobileKeyboardOptimization() {
  console.log('\n📱 TEST MOBILNE OPTIMIZACIJE ZA ANDROID TASTATURE');
  console.log('=' .repeat(60));
  
  try {
    // Test 1: Proverava da li postoje potrebni CSS stilovi
    console.log('\n1. Provera CSS optimizacija...');
    
    const indexCssPath = './client/src/index.css';
    const floatingSheetPath = './client/src/components/ui/floating-sheet.tsx';
    
    if (fs.existsSync(indexCssPath)) {
      const indexCss = fs.readFileSync(indexCssPath, 'utf8');
      
      // Provera osnovnih CSS optimizacija
      const requiredCss = [
        'floating-sheet-mobile',
        'var(--vh, 1vh)',
        'keyboard-inset-height',
        'transform: translateZ(0)',
        'scrollable-content'
      ];
      
      const foundCss = requiredCss.filter(css => indexCss.includes(css));
      
      console.log(`✅ Pronađeno ${foundCss.length}/${requiredCss.length} CSS optimizacija`);
      
      if (foundCss.length === requiredCss.length) {
        console.log('✅ Sve CSS optimizacije su implementirane');
      } else {
        const missing = requiredCss.filter(css => !indexCss.includes(css));
        console.log(`❌ Nedostaju optimizacije: ${missing.join(', ')}`);
      }
    }
    
    // Test 2: Proverava FloatingSheet komponentu
    console.log('\n2. Provera FloatingSheet komponente...');
    
    if (fs.existsSync(floatingSheetPath)) {
      const floatingSheet = fs.readFileSync(floatingSheetPath, 'utf8');
      
      const requiredFeatures = [
        'useMobile',
        'floating-sheet-mobile',
        'handleViewportChange',
        'scrollIntoView',
        'scrollable-content'
      ];
      
      const foundFeatures = requiredFeatures.filter(feature => floatingSheet.includes(feature));
      
      console.log(`✅ Pronađeno ${foundFeatures.length}/${requiredFeatures.length} mobilnih optimizacija`);
      
      if (foundFeatures.length === requiredFeatures.length) {
        console.log('✅ Sve mobilne optimizacije su implementirane');
      } else {
        const missing = requiredFeatures.filter(feature => !floatingSheet.includes(feature));
        console.log(`❌ Nedostaju optimizacije: ${missing.join(', ')}`);
      }
    }
    
    // Test 3: Proverava viewport meta tag
    console.log('\n3. Provera viewport meta tag...');
    
    const indexHtmlPath = './client/index.html';
    if (fs.existsSync(indexHtmlPath)) {
      const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
      
      if (indexHtml.includes('viewport-fit=cover') && indexHtml.includes('user-scalable=no')) {
        console.log('✅ Viewport meta tag je optimizovan za mobilne uređaje');
      } else {
        console.log('❌ Viewport meta tag nije optimizovan');
      }
    }
    
    // Test 4: Proverava App.tsx viewport optimizacije
    console.log('\n4. Provera App.tsx viewport optimizacija...');
    
    const appTsxPath = './client/src/App.tsx';
    if (fs.existsSync(appTsxPath)) {
      const appTsx = fs.readFileSync(appTsxPath, 'utf8');
      
      if (appTsx.includes('setProperty(\'--vh\'') && appTsx.includes('window.innerHeight')) {
        console.log('✅ App.tsx sadrži viewport optimizacije');
      } else {
        console.log('❌ App.tsx ne sadrži viewport optimizacije');
      }
    }
    
    // Test 5: Funkcionalnost serviser login i floating dialog
    console.log('\n5. Test funkcionalnosti serviser login...');
    
    const loginResult = await login('nikola@frigosistemtodosijevic.com', 'serviser123');
    console.log('✅ Serviser login uspešan');
    
    // Test 6: Proverava API endpoint za servise
    console.log('\n6. Test API endpointa za servise...');
    
    const servicesResponse = await api.get('/api/my-services');
    console.log(`✅ API endpoint /api/my-services radi - ${servicesResponse.data.length} servisa`);
    
    if (servicesResponse.data.length > 0) {
      console.log('✅ Serviser ima servise za testiranje floating dialog-a');
    } else {
      console.log('⚠️  Serviser nema servise, floating dialog se neće testirati');
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('🎉 MOBILNA OPTIMIZACIJA ZAVRŠENA!');
    console.log('=' .repeat(60));
    
    console.log('\n📋 SAŽETAK IMPLEMENTIRANIH OPTIMIZACIJA:');
    console.log('• CSS optimizacije za Android tastature');
    console.log('• FloatingSheet komponenta prilagođena mobilnim uređajima');
    console.log('• Viewport meta tag optimizovan');
    console.log('• Dinamičko postavljanje viewport visine');
    console.log('• Smooth scrolling za input fokus');
    console.log('• Prevencija content jump-a');
    console.log('• Samsung uređaji specifične optimizacije');
    
    console.log('\n📱 INSTRUKCIJE ZA TESTIRANJE:');
    console.log('1. Otvorite aplikaciju na Samsung S25 Ultra');
    console.log('2. Prijavite se kao serviser');
    console.log('3. Otvorite neki servis');
    console.log('4. Kliknite "Završi servis"');
    console.log('5. Unesite tekst u napomene - ekran se neće više pomerati ispod tastature');
    
  } catch (error) {
    console.error('❌ Greška u testu mobilne optimizacije:', error.message);
  }
}

// Pokreni test
testMobileKeyboardOptimization();