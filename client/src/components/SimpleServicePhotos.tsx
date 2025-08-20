import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { PhotoUploader } from './PhotoUploader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Camera, Upload, Eye, Trash2, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ServicePhoto {
  id: number;
  serviceId: number;
  photoUrl: string;
  photoCategory: string;
  description?: string;
  uploadedBy: number;
  uploadedAt: string;
  fileName?: string;
  fileSize?: number;
}

interface SimpleServicePhotosProps {
  serviceId: number;
  readOnly?: boolean;
  showUpload?: boolean;
}

const PHOTO_CATEGORIES = [
  { value: 'before', label: 'Pre popravke', color: 'bg-red-100 text-red-800' },
  { value: 'after', label: 'Posle popravke', color: 'bg-green-100 text-green-800' },
  { value: 'parts', label: 'Rezervni delovi', color: 'bg-blue-100 text-blue-800' },
  { value: 'damage', label: 'Oštećenja', color: 'bg-orange-100 text-orange-800' },
  { value: 'documentation', label: 'Dokumentacija', color: 'bg-purple-100 text-purple-800' },
  { value: 'other', label: 'Ostalo', color: 'bg-gray-100 text-gray-800' }
];

export function SimpleServicePhotos({ serviceId, readOnly = false, showUpload = true }: SimpleServicePhotosProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<ServicePhoto | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  console.log('📸 SimpleServicePhotos rendered for serviceId:', serviceId);
  
  // Debug JWT token
  const authToken = localStorage.getItem('auth_token');
  console.log('📸 Current auth token:', authToken?.substring(0, 50) + '...');
  console.log('📸 Token exists:', !!authToken);

  // Manual test function
  const testEndpoint = async () => {
    const token = localStorage.getItem('auth_token');
    const testUrl = `/api/service-photos?serviceId=${serviceId}`;
    console.log('📸 Testing endpoint:', testUrl);
    
    try {
      const response = await fetch(testUrl, {
        credentials: 'include'  // Only need cookies for session auth
      });
      
      console.log('📸 Test response status:', response.status);
      console.log('📸 Test response ok:', response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📸 Test response data:', data);
      } else {
        const errorText = await response.text();
        console.log('📸 Test error response:', errorText);
      }
    } catch (error) {
      console.error('📸 Test fetch error:', error);
    }
  };
  
  // Run test on component mount
  React.useEffect(() => {
    if (serviceId > 0 && authToken) {
      console.log('📸 Running endpoint test...');
      console.log('📸 Auth system: Session-based (no JWT needed)');
      testEndpoint();
    }
  }, [serviceId]);

  // Use the actual JWT-protected endpoint  
  const { data: photos = [], isLoading, error, refetch } = useQuery<ServicePhoto[]>({
    queryKey: [`/api/service-photos?serviceId=${serviceId}`],
    enabled: !!serviceId && serviceId > 0
  });

  // Upload photos
  const uploadPhotosMutation = useMutation({
    mutationFn: async (photoUrls: string[]) => {
      console.log('📸 Uploading photos for serviceId:', serviceId, 'URLs:', photoUrls);
      
      for (const photoUrl of photoUrls) {
        await apiRequest('/api/service-photos', {
          method: 'POST',
          body: JSON.stringify({
            serviceId,
            photoUrl,
            photoCategory: 'other',
            description: 'Uploaded via object storage'
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
      
      return photoUrls;
    },
    onSuccess: () => {
      toast({
        title: "Slike su uspešno otpremljene",
        description: "Sve slike su sačuvane u sistemu.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/service-photos', serviceId] });
    },
    onError: (error) => {
      console.error('📸 Upload error:', error);
      toast({
        title: "Greška pri otpremanju",
        description: "Došlo je do greške prilikom čuvanja slika.",
        variant: "destructive",
      });
    },
  });

  // Delete photo
  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: number) => {
      await apiRequest(`/api/service-photos/${photoId}`, {
        method: 'DELETE'
      });
      return photoId;
    },
    onSuccess: () => {
      toast({
        title: "Slika je obrisana",
        description: "Slika je uspešno uklonjena iz sistema.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/service-photos', serviceId] });
    },
    onError: (error) => {
      console.error('📸 Delete error:', error);
      toast({
        title: "Greška pri brisanju",
        description: "Došlo je do greške prilikom brisanja slike.",
        variant: "destructive",
      });
    },
  });

  // Handle upload
  const handleGetUploadParameters = async () => {
    console.log('📸 Getting upload parameters...');
    const response = await apiRequest('/api/objects/upload', {
      method: 'POST'
    }) as { uploadURL: string };
    console.log('📸 Upload parameters:', response);
    return {
      method: 'PUT' as const,
      url: response.uploadURL,
    };
  };

  const handleUploadComplete = (result: any) => {
    console.log('📸 Upload completed:', result);
    const uploadedUrls = result.successful.map((file: any) => file.uploadURL);
    uploadPhotosMutation.mutate(uploadedUrls);
  };

  const getCategoryInfo = (category: string) => {
    return PHOTO_CATEGORIES.find(cat => cat.value === category) || PHOTO_CATEGORIES[5];
  };

  console.log('📸 Rendering with photos:', photos.length, 'isLoading:', isLoading, 'error:', error);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Učitavam fotografije...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    console.error('📸 Error loading photos:', error);
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p className="font-medium">Greška pri učitavanju fotografija</p>
            <p className="text-sm mt-1">{error instanceof Error ? error.message : 'Nepoznata greška'}</p>
            <Button 
              onClick={() => refetch()} 
              variant="outline" 
              size="sm" 
              className="mt-3"
            >
              Pokušaj ponovo
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      {showUpload && !readOnly && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Otpremi nove fotografije</CardTitle>
              {uploadPhotosMutation.isPending && (
                <div className="text-sm text-muted-foreground">Čuvam slike...</div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <PhotoUploader
              maxNumberOfFiles={5}
              onGetUploadParameters={handleGetUploadParameters}
              onComplete={handleUploadComplete}
              buttonClassName="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Izaberi slike
            </PhotoUploader>
            <p className="text-xs text-muted-foreground mt-2">
              Možete otpremiti do 5 slika odjednom. Maksimalna veličina po slici: 10MB
            </p>
          </CardContent>
        </Card>
      )}

      {/* Photos Display */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Fotografije servisa ({photos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {photos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nema otpremljenih fotografija za ovaj servis</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo) => {
                const categoryInfo = getCategoryInfo(photo.photoCategory);
                return (
                  <div key={photo.id} className="relative group">
                    <div className="aspect-square overflow-hidden rounded-lg border bg-gray-50">
                      <img
                        src={photo.photoUrl}
                        alt={photo.description || 'Service photo'}
                        className="w-full h-full object-cover cursor-pointer transition-all group-hover:scale-105"
                        onClick={() => setSelectedPhoto(photo)}
                        onError={(e) => {
                          console.error('📸 Image load error:', photo.photoUrl);
                          const target = e.target as HTMLImageElement;
                          // FALLBACK STRATEGIJA: Pokušaj alternativne putanje
                          const altSrc = photo.photoPath?.replace('/uploads/', '/uploads/') || photo.photoUrl;
                          if (target.src !== altSrc && altSrc !== photo.photoUrl) {
                            target.src = altSrc;
                            return;
                          }
                          target.src = '/api/placeholder/300x200?text=Slika+nedostaje';
                        }}
                      />
                    </div>
                    
                    <div className="mt-2">
                      <Badge className={`text-xs ${categoryInfo.color}`}>
                        {categoryInfo.label}
                      </Badge>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 w-8 p-0 bg-white/80 hover:bg-white"
                          onClick={() => setSelectedPhoto(photo)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!readOnly && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 w-8 p-0"
                            onClick={() => deletePhotoMutation.mutate(photo.id)}
                            disabled={deletePhotoMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo View Dialog */}
      {selectedPhoto && (
        <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>
                {getCategoryInfo(selectedPhoto.photoCategory).label}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center space-y-4">
              <img
                src={selectedPhoto.photoUrl}
                alt={selectedPhoto.description || 'Service photo'}
                className="max-w-full max-h-[60vh] object-contain rounded-lg"
              />
              <div className="text-center space-y-2">
                {selectedPhoto.description && (
                  <p className="text-sm text-muted-foreground">{selectedPhoto.description}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Otpremljeno: {new Date(selectedPhoto.uploadedAt).toLocaleString('sr-RS')}
                </p>
                {selectedPhoto.fileName && (
                  <p className="text-xs text-muted-foreground">
                    Fajl: {selectedPhoto.fileName}
                  </p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}