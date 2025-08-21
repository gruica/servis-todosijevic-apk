import React, { useState } from "react";
import { Button } from "@/components/ui/button";

// JEDNOSTAVAN TEST KOMPONENTA - čist kod kao servis 234
export function SimplePhotoTest() {
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<string>("");

  const handleTestUpload = async () => {
    setIsUploading(true);
    setResult("Testiranje...");

    try {
      // Jednostavan base64 test image
      const testImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

      const response = await fetch("/api/simple-photos/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          base64Data: testImage,
          serviceId: 228,
          description: "Test jednostavan photo sistem",
          category: "test"
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setResult(`✅ USPEH! Fotografija sačuvana: ${data.url}`);
      } else {
        setResult(`❌ Greška: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      setResult(`❌ Greška: ${error}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-6 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Test Jednostavan Photo Sistem</h3>
      
      <Button 
        onClick={handleTestUpload} 
        disabled={isUploading}
        className="mb-4"
      >
        {isUploading ? "Testiranje..." : "Test Upload"}
      </Button>
      
      {result && (
        <div className={`p-3 rounded ${result.startsWith('✅') ? 'bg-green-100' : 'bg-red-100'}`}>
          {result}
        </div>
      )}
    </div>
  );
}