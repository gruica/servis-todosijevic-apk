import React, { useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Camera, Upload, Mic, MapPin, Image, Check, X, Loader2 } from 'lucide-react';
import { useNativeCamera } from '@/utils/nativeCameraUtils';

interface MobilePhotoUploaderProps {
  serviceId: number;
  onPhotoUploaded?: (photo: any) => void;
  onClose?: () => void;
}

const PHOTO_CATEGORIES = [
  { value: 'before', label: '📸 Pre popravke', color: 'bg-red-100 text-red-800' },
  { value: 'after', label: '✅ Posle popravke', color: 'bg-green-100 text-green-800' },
  { value: 'parts', label: '🔧 Rezervni delovi', color: 'bg-blue-100 text-blue-800' },
  { value: 'problem', label: '⚠️ Problem/Kvar', color: 'bg-orange-100 text-orange-800' },
  { value: 'serial', label: '🏷️ Serijski broj', color: 'bg-purple-100 text-purple-800' },
  { value: 'location', label: '📍 Lokacija', color: 'bg-gray-100 text-gray-800' }
];

export function MobilePhotoUploader({ serviceId, onPhotoUploaded, onClose }: MobilePhotoUploaderProps) {
  const [selectedCategory, setSelectedCategory] = useState('before');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [location, setLocation] = useState<GeolocationPosition | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { capturePhoto, pickFromGallery, isNativeSupported } = useNativeCamera();

  // Get current location
  const getCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation(position);
          toast({
            title: "Lokacija dohvaćena",
            description: `Lat: ${position.coords.latitude.toFixed(6)}, Lng: ${position.coords.longitude.toFixed(6)}`,
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast({
            title: "Greška",
            description: "Ne mogu da dohvatim lokaciju",
            variant: "destructive",
          });
        }
      );
    }
  };

  // Handle camera capture (Native vs Web)
  const handleCameraCapture = async () => {
    try {
      const photo = await capturePhoto({
        quality: 80,
        correctOrientation: true,
        source: 'camera'
      });
      setCapturedImage(photo.dataUrl);
      toast({
        title: "📸 Fotografija snimljena",
        description: isNativeSupported ? "Koristite native kameru" : "Koristite web kameru",
      });
    } catch (error: any) {
      console.error('Camera capture error:', error);
      // Fallback to web input if native fails
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      }
    }
  };

  // Fallback web camera capture
  const handleWebCameraCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setCapturedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle gallery selection (Native vs Web)
  const handleGallerySelect = async () => {
    try {
      const photo = await pickFromGallery({
        quality: 80,
        correctOrientation: true,
        source: 'gallery'
      });
      setCapturedImage(photo.dataUrl);
      toast({
        title: "🖼️ Slika odabrana",
        description: isNativeSupported ? "Koristi native galeriju" : "Koristi web galeriju",
      });
    } catch (error: any) {
      console.error('Gallery selection error:', error);
      // Fallback to web input if native fails
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  };

  // Fallback web file selection
  const handleWebFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setCapturedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Voice recording (simplified - would need Web Speech API)
  const handleVoiceNote = () => {
    setIsRecording(!isRecording);
    // Simplified - would implement actual speech recognition
    if (!isRecording) {
      toast({
        title: "Glasovni opis",
        description: "Funkcionalnost glasovnih beleški će biti dostupna uskoro",
      });
    }
  };

  // Upload photo
  const handleUpload = async () => {
    if (!capturedImage) {
      toast({
        title: "Greška",
        description: "Molimo odaberite fotografiju",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Nije moguće pristupiti - molimo prijavite se ponovo');
      }

      // Enhanced description with location
      let enhancedDescription = description;
      if (location) {
        enhancedDescription += ` [Lokacija: ${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}]`;
      }
      enhancedDescription += ` [Mobilni upload: ${new Date().toLocaleString('sr-RS')}]`;

      const response = await fetch('/api/service-photos/upload-base64', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          image: capturedImage,
          serviceId: serviceId,
          category: selectedCategory,
          description: enhancedDescription,
          location: location ? {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          } : undefined
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      
      toast({
        title: "Fotografija uspešno dodana!",
        description: `Kategorija: ${PHOTO_CATEGORIES.find(c => c.value === selectedCategory)?.label}`,
      });

      if (onPhotoUploaded) {
        onPhotoUploaded(result);
      }

      // Reset form
      setCapturedImage(null);
      setDescription('');
      setSelectedCategory('before');
      setLocation(null);

      if (onClose) {
        onClose();
      }

    } catch (error: any) {
      console.error('Mobile upload error:', error);
      toast({
        title: "Greška pri upload-u",
        description: error.message || "Neočekivana greška",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const selectedCategoryInfo = PHOTO_CATEGORIES.find(c => c.value === selectedCategory);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Dodaj fotografiju - Servis #{serviceId}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Photo Capture Options */}
        {!capturedImage ? (
          <div className="space-y-3">
            {/* Camera Button */}
            <Button 
              onClick={handleCameraCapture}
              className="w-full h-12 text-base"
              size="lg"
            >
              <Camera className="h-6 w-6 mr-2" />
              {isNativeSupported ? '📱 Native kamera' : '🌐 Web kamera'}
            </Button>
            
            {/* Gallery Button */}
            <Button 
              onClick={handleGallerySelect}
              variant="outline"
              className="w-full h-12 text-base"
              size="lg"
            >
              <Image className="h-6 w-6 mr-2" />
              {isNativeSupported ? '📱 Native galerija' : '🌐 Web galerija'}
            </Button>

            {/* Location Button */}
            <Button 
              onClick={getCurrentLocation}
              variant="outline"
              className="w-full h-10"
              size="sm"
            >
              <MapPin className="h-4 w-4 mr-2" />
              {location ? 'Lokacija dohvaćena ✓' : 'Dodaj lokaciju'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Image Preview */}
            <div className="relative">
              <img 
                src={capturedImage} 
                alt="Preview" 
                className="w-full rounded-lg max-h-48 object-cover"
              />
              <Button
                onClick={() => setCapturedImage(null)}
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Category Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Kategorija:</label>
              <div className="grid grid-cols-2 gap-2">
                {PHOTO_CATEGORIES.map((category) => (
                  <Button
                    key={category.value}
                    onClick={() => setSelectedCategory(category.value)}
                    variant={selectedCategory === category.value ? "default" : "outline"}
                    className="h-12 text-sm p-2"
                    size="sm"
                  >
                    {category.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Opis:</label>
                <Button
                  onClick={handleVoiceNote}
                  variant="ghost"
                  size="sm"
                  className={isRecording ? 'text-red-600' : ''}
                >
                  <Mic className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Dodaj opis fotografije..."
                className="resize-none"
                rows={3}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => setCapturedImage(null)}
                variant="outline"
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Otkaži
              </Button>
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                className="flex-1"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Upload...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Sačuvaj
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Hidden file inputs (web fallback) */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleWebCameraCapture}
          className="hidden"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleWebFileSelect}
          className="hidden"
        />

        {/* Status Info */}
        {selectedCategoryInfo && capturedImage && (
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
            <Badge className={selectedCategoryInfo.color}>
              {selectedCategoryInfo.label}
            </Badge>
            {location && (
              <Badge variant="outline">
                <MapPin className="h-3 w-3 mr-1" />
                GPS
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}