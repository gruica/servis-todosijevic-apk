import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

/**
 * Komplet test komponenta za ČISTI photo upload sistem
 */
export function CleanPhotoTest() {
  const [isUploading, setIsUploading] = useState(false);
  const [serviceId, setServiceId] = useState('228');
  const [description, setDescription] = useState('Test čistog upload sistema');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const { toast } = useToast();

  // Upload foto
  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "Greška",
        description: "Molimo odaberite fotografiju",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Konvertuj u base64
      const base64 = await fileToBase64(selectedFile);
      
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Token not found');
      }

      const response = await fetch('/api/clean-photos/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          base64Data: base64,
          serviceId: parseInt(serviceId),
          photoCategory: 'clean-test',
          description: description,
        }),
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const result = await response.json();
      
      toast({
        title: "✅ Upload uspešan!",
        description: `Fajl: ${result.filename}`,
      });

      // Reset form
      setSelectedFile(null);
      setDescription('Test čistog upload sistema');
      
      // Refresh photos
      loadPhotos();

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "❌ Upload greška",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Load photos
  const loadPhotos = async () => {
    try {
      const response = await fetch(`/api/clean-photos?serviceId=${serviceId}`);
      if (response.ok) {
        const data = await response.json();
        setPhotos(data);
      }
    } catch (error) {
      console.error('Load photos error:', error);
    }
  };

  // File to base64 converter
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>🧪 Test Čistog Photo Sistema</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Form */}
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="text-sm font-medium">Service ID:</label>
            <Input
              type="number"
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              placeholder="Unesite service ID"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Opis:</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Unesite opis fotografije"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Fotografija:</label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
          </div>
          
          <Button 
            onClick={handleUpload} 
            disabled={isUploading || !selectedFile}
            className="w-full"
          >
            {isUploading ? '📤 Uploadujem...' : '📤 Upload Fotografiju'}
          </Button>
        </div>

        {/* Load Photos Button */}
        <Button 
          onClick={loadPhotos} 
          variant="outline"
          className="w-full"
        >
          📸 Učitaj Fotografije za Servis {serviceId}
        </Button>

        {/* Photos Display */}
        {photos.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-medium">📋 Fotografije ({photos.length}):</h3>
            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
              {photos.map((photo) => (
                <div key={photo.id} className="p-2 border rounded text-sm">
                  <div className="font-medium">ID: {photo.id}</div>
                  <div>Path: {photo.photoPath}</div>
                  <div>Opis: {photo.description}</div>
                  <div>Kategorija: {photo.category}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(photo.uploadedAt).toLocaleString('sr-RS')}
                  </div>
                  {/* Test Image Display */}
                  <img 
                    src={photo.photoPath} 
                    alt={photo.description}
                    className="mt-2 max-w-32 max-h-32 object-cover border rounded"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}