// SISTEMSKA ANALIZA FOTOGRAFIJA - Servis 217
console.log('=== POČETAK SISTEMSKE ANALIZE ===');

// 1. Proverava bazu podataka
async function checkDatabase() {
  const { db } = await import('./server/db.js');
  const { servicePhotos } = await import('./shared/schema.js');
  const { eq } = await import('drizzle-orm');
  
  console.log('1. PROVERA BAZE PODATAKA:');
  try {
    const photos = await db.select().from(servicePhotos).where(eq(servicePhotos.serviceId, 217));
    console.log('   Broj fotografija u bazi:', photos.length);
    photos.forEach(photo => {
      console.log('   - ID:', photo.id, 'Path:', photo.photoPath, 'Category:', photo.category);
    });
    return photos;
  } catch (error) {
    console.error('   GREŠKA u bazi:', error.message);
    return [];
  }
}

// 2. Provera fajlova na disk-u
async function checkFiles(photos) {
  const fs = await import('fs');
  const path = await import('path');
  
  console.log('2. PROVERA FAJLOVA:');
  
  for (const photo of photos) {
    const filePath = path.join(process.cwd(), photo.photoPath.startsWith('/') ? photo.photoPath.slice(1) : photo.photoPath);
    console.log('   Provera fajla:', filePath);
    
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log('   ✅ POSTOJI - veličina:', stats.size, 'bytes');
    } else {
      console.log('   ❌ NE POSTOJI');
    }
  }
}

// 3. Test API endpoint-a
async function testAPI() {
  console.log('3. TEST API ENDPOINT-A:');
  
  try {
    const response = await fetch('http://localhost:5000/api/service-photos?serviceId=217', {
      headers: {
        'Authorization': 'Bearer test-token' // Ovo neće raditi, ali možemo videti error
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ API OK - broj fotografija:', data.length);
      data.forEach(photo => {
        console.log('   - photoUrl:', photo.photoUrl, 'category:', photo.photoCategory);
      });
    } else {
      console.log('   ❌ API ERROR:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('   ❌ API FETCH ERROR:', error.message);
  }
}

// 4. Test direktnog pristupa fotografiji
async function testDirectAccess(photos) {
  console.log('4. TEST DIREKTNOG PRISTUPA:');
  
  for (const photo of photos) {
    try {
      const url = `http://localhost:5000${photo.photoPath}`;
      console.log('   Testiranje URL-a:', url);
      
      const response = await fetch(url);
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        const contentLength = response.headers.get('content-length');
        console.log('   ✅ OK - tip:', contentType, 'veličina:', contentLength);
      } else {
        console.log('   ❌ ERROR:', response.status);
      }
    } catch (error) {
      console.log('   ❌ FETCH ERROR:', error.message);
    }
  }
}

// Pokretanje analize
async function runAnalysis() {
  const photos = await checkDatabase();
  await checkFiles(photos);
  await testAPI();
  await testDirectAccess(photos);
  
  console.log('=== KRAJ SISTEMSKE ANALIZE ===');
}

runAnalysis().catch(console.error);