import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Camera, Upload, X, Eye, Download, Trash2, Plus, RotateCcw, Edit3 } from 'lucide-react';

// Types
export interface ServicePhoto {
  id: number;
  serviceId: number;
  photoUrl: string;
  photoCategory: string;
  description?: string;
  uploadedBy?: string;
  uploadedAt?: string;
  fileName?: string;
  fileSize?: number;
}

const PHOTO_CATEGORIES = [
  { value: 'before', label: 'Pre popravke', color: 'bg-red-500' },
  { value: 'during', label: 'Tokom popravke', color: 'bg-yellow-500' },
  { value: 'after', label: 'Posle popravke', color: 'bg-green-500' },
  { value: 'parts', label: 'Rezervni delovi', color: 'bg-blue-500' },
  { value: 'damage', label: 'Oštećenje', color: 'bg-red-600' },
  { value: 'other', label: 'Ostalo', color: 'bg-gray-500' }
];

interface ServicePhotosProps {
  serviceId: number;
  readOnly?: boolean;
  showUpload?: boolean;
}

export function ServicePhotos({ serviceId, readOnly = false, showUpload = true }: ServicePhotosProps) {
  console.log('🔧 ServicePhotos rendered - serviceId:', serviceId, 'readOnly:', readOnly, 'showUpload:', showUpload);

  // Direct state management
  const [photos, setPhotos] = useState<ServicePhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<ServicePhoto | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  const loadPhotos = useCallback(async () => {
    console.log('🔥 DIREKTAN API POZIV ZAPOČET za serviceId:', serviceId);
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('auth_token');
      console.log('🔑 JWT Token status:', token ? 'POSTOJI' : 'NEMA');
      
      if (!token) {
        throw new Error('Korisnik nije prijavljen');
      }
      
      const url = `/api/service-photos?serviceId=${serviceId}`;
      console.log('🌐 Pozivam:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        credentials: 'include',
        cache: 'no-store'
      });
      
      console.log('🌐 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API greška:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data: ServicePhoto[] = await response.json();
      console.log('✅ API USPEŠAN - učitano:', data.length, 'fotografija');
      console.log('✅ Podaci:', data);
      console.log('🎯 POSTAVLJAM STATE:', data);
      setPhotos(data);
      
    } catch (err) {
      console.error('❌ Greška pri učitavanju fotografija:', err);
      setError(err as Error);
      setPhotos([]);
    } finally {
      setIsLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    if (serviceId > 0) {
      loadPhotos();
    }
  }, [serviceId, loadPhotos]);

  // State logging
  console.log('🔍 DIREKTAN STATE:', { 
    serviceId, 
    isLoading, 
    hasPhotos: photos.length > 0, 
    count: photos.length,
    error: error?.message,
    photos: photos
  });

  if (serviceId === 217) {
    console.log('🚨 ServicePhotos KOMPONENTA RENDEROVANA ZA SERVIS 217!');
    console.log('🔧 ServicePhotos Debug for 217:', {
      serviceId,
      photos,
      count: photos.length,
      isLoading,
      error,
      photosType: typeof photos,
      photosStringified: JSON.stringify(photos)
    });
  }

  // Poboljšan file upload sa JWT autentifikacijom i progress tracking
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    console.log('📸 [FRONTEND UPLOAD] Starting upload of', files.length, 'files');
    setIsUploading(true);
    
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Nije moguće pristupiti - molimo prijavite se ponovo');
      }

      const uploadedPhotos = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`📸 [FRONTEND UPLOAD] Processing file ${i + 1}/${files.length}:`, file.name);
        
        // Validacija fajla
        if (!file.type.startsWith('image/')) {
          throw new Error(`Fajl "${file.name}" nije slika`);
        }
        
        if (file.size > 10 * 1024 * 1024) { // 10MB
          throw new Error(`Fajl "${file.name}" je prevelik (maksimalno 10MB)`);
        }

        const formData = new FormData();
        formData.append('photo', file);
        formData.append('serviceId', serviceId.toString());
        formData.append('photoCategory', 'other');
        formData.append('description', `Admin upload: ${file.name}`);

        console.log(`📸 [FRONTEND UPLOAD] Uploading ${file.name} with JWT token...`);
        
        const response = await fetch('/api/service-photos/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        console.log(`📸 [FRONTEND UPLOAD] Response status:`, response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`📸 [FRONTEND UPLOAD] Error response:`, errorText);
          throw new Error(`Upload failed for "${file.name}": ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log(`📸 [FRONTEND UPLOAD] Success result:`, result);
        uploadedPhotos.push(result.photo);
      }

      toast({
        title: "Fotografije uspešno dodane",
        description: `Uspešno dodano ${uploadedPhotos.length} fotografija`,
      });
      
      console.log('📸 [FRONTEND UPLOAD] All uploads complete, reloading photos...');
      loadPhotos(); // Reload photos to show new ones
      
    } catch (error: any) {
      console.error('📸 [FRONTEND UPLOAD] Upload error:', error);
      toast({
        title: "Greška pri dodavanju fotografija",
        description: error.message || "Neočekivana greška tokom upload-a",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const photosByCategory = photos.reduce((acc: Record<string, ServicePhoto[]>, photo: ServicePhoto) => {
    const category = photo.photoCategory || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(photo);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Fotografije servisa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Učitavanje fotografija...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Fotografije servisa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <X className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <p className="text-red-600">Greška: {error.message}</p>
              <Button onClick={loadPhotos} className="mt-4">
                Pokušaj ponovo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Fotografije servisa ({photos.length})
          </div>
          {showUpload && !readOnly && (
            <div className="flex items-center gap-2">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="photo-upload"
                disabled={isUploading}
              />
              <Button
                variant="outline"
                size="sm"
                asChild
                disabled={isUploading}
              >
                <label htmlFor="photo-upload" className="cursor-pointer">
                  <Plus className="h-4 w-4 mr-2" />
                  {isUploading ? 'Upload...' : 'Dodaj foto'}
                </label>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadPhotos}
                disabled={isLoading}
              >
                <Camera className="h-4 w-4 mr-2" />
                Osvezi
              </Button>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {photos.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nema fotografija za ovaj servis</p>
              {showUpload && !readOnly && (
                <p className="text-sm text-gray-500 mt-2">
                  Koristite dugme "Dodaj foto" da postavite fotografije
                </p>
              )}
            </div>
          </div>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="all">Sve ({photos.length})</TabsTrigger>
              {PHOTO_CATEGORIES.map(category => {
                const count = photosByCategory[category.value]?.length || 0;
                return (
                  <TabsTrigger
                    key={category.value}
                    value={category.value}
                    className="text-xs"
                  >
                    {category.label} ({count})
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {photos.map((photo) => (
                  <PhotoCard key={photo.id} photo={photo} onView={setSelectedPhoto} />
                ))}
              </div>
            </TabsContent>

            {PHOTO_CATEGORIES.map(category => (
              <TabsContent key={category.value} value={category.value} className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {photosByCategory[category.value]?.map((photo) => (
                    <PhotoCard key={photo.id} photo={photo} onView={setSelectedPhoto} />
                  )) || <p className="text-gray-500 col-span-full text-center py-8">Nema fotografija u ovoj kategoriji</p>}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}

        {/* Photo View Modal */}
        {selectedPhoto && (
          <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>
                  Fotografija #{selectedPhoto.id}
                  <Badge 
                    className={`ml-2 ${PHOTO_CATEGORIES.find(c => c.value === selectedPhoto.photoCategory)?.color || 'bg-gray-500'}`}
                  >
                    {PHOTO_CATEGORIES.find(c => c.value === selectedPhoto.photoCategory)?.label || selectedPhoto.photoCategory}
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <img
                  src={selectedPhoto.photoUrl}
                  alt={selectedPhoto.description || 'Fotografija servisa'}
                  className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
                />
                {selectedPhoto.description && (
                  <p className="text-sm text-gray-600">{selectedPhoto.description}</p>
                )}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Datum: {selectedPhoto.uploadedAt ? new Date(selectedPhoto.uploadedAt).toLocaleDateString('sr-RS') : 'Nepoznato'}</span>
                  {selectedPhoto.fileName && <span>Fajl: {selectedPhoto.fileName}</span>}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}

interface PhotoCardProps {
  photo: ServicePhoto;
  onView: (photo: ServicePhoto) => void;
}

function PhotoCard({ photo, onView }: PhotoCardProps) {
  const categoryInfo = PHOTO_CATEGORIES.find(c => c.value === photo.photoCategory);
  
  return (
    <div className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-square bg-gray-100 relative overflow-hidden">
        <img
          src={photo.photoUrl}
          alt={photo.description || 'Fotografija servisa'}
          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
          onClick={() => onView(photo)}
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            img.src = '/api/placeholder/300x300?text=Foto+nije+dostupna';
          }}
        />
        <Badge 
          className={`absolute top-2 right-2 ${categoryInfo?.color || 'bg-gray-500'}`}
        >
          {categoryInfo?.label || photo.photoCategory}
        </Badge>
      </div>
      <div className="p-3">
        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
          {photo.description || 'Fotografija servisa'}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {photo.uploadedAt ? new Date(photo.uploadedAt).toLocaleDateString('sr-RS') : 'Nepoznato'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onView(photo)}
            className="h-8 w-8 p-0"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}