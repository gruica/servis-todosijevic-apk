// Test upload fotografije za praćenje putanje
import fetch from 'node-fetch';

// Kreirati minimalna test slika (1x1 pixel PNG u base64)
const testImageBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

// Test JWT token za admin korisnika (ID 10 - Jelena Todosijević)
const testToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEwLCJ1c2VybmFtZSI6ImplbGVuYUBmcmlnb3Npc3RlbXRvZG9zaWpldmljLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTczNDc2NjM4NSwiZXhwIjoxNzM3MzU4Mzg1fQ.test";

async function testUpload() {
  console.log("🚀 POKRETANJE UPLOAD TESTA");
  console.log("📡 Pozivam /api/service-photos/upload-base64");
  
  try {
    const response = await fetch('http://localhost:5173/api/service-photos/upload-base64', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`
      },
      body: JSON.stringify({
        base64Data: testImageBase64,
        serviceId: 228,
        photoCategory: "test",
        description: "TEST - Praćenje putanje upload-a",
        filename: "test_upload_trace.png"
      })
    });

    console.log("📊 Response Status:", response.status);
    console.log("📊 Response Headers:", Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const result = await response.json();
      console.log("✅ UPLOAD USPEŠAN:");
      console.log("📸 Photo ID:", result.id);
      console.log("📸 Photo Path:", result.photoPath || result.photoUrl);
      console.log("📸 File Size:", result.fileSize);
    } else {
      const errorText = await response.text();
      console.log("❌ UPLOAD NEUSPEŠAN:");
      console.log("🚨 Error:", errorText);
    }
    
  } catch (error) {
    console.log("💥 NETWORK ERROR:", error.message);
  }
}

testUpload();