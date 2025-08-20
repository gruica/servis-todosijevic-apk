import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Camera, Upload, Eye, Trash2, Calendar, User, FileImage, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface ServicePhoto {
  id: number;
  serviceId: number;
  photoUrl: string;
  photoCategory: string;
  description?: string;
  uploadedBy: number;
  uploadedAt: string;
  fileSize?: number;
  fileName?: string;
}

interface ServicePhotosProps {
  serviceId: number;
  readOnly?: boolean;
  showUpload?: boolean;
}

const PHOTO_CATEGORIES = [
  { value: 'before', label: '📸 Pre popravke', color: 'bg-red-100 text-red-800' },
  { value: 'after', label: '✅ Posle popravke', color: 'bg-green-100 text-green-800' },
  { value: 'parts', label: '🔧 Rezervni delovi', color: 'bg-blue-100 text-blue-800' },
  { value: 'damage', label: '⚠️ Oštećenja', color: 'bg-orange-100 text-orange-800' },
  { value: 'documentation', label: '📄 Dokumentacija', color: 'bg-purple-100 text-purple-800' },
  { value: 'other', label: '📂 Ostalo', color: 'bg-gray-100 text-gray-800' }
];

export function ServicePhotos({ serviceId, readOnly = false, showUpload = true }: ServicePhotosProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<ServicePhoto | null>(null);
  const [uploadCategory, setUploadCategory] = useState('other');
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Debug logging
  console.log('🔧 ServicePhotos rendered - serviceId:', serviceId, 'readOnly:', readOnly, 'showUpload:', showUpload);

  // Fetch service photos
  const { data: photos = [], isLoading, refetch, error } = useQuery<ServicePhoto[]>({
    queryKey: ['/api/service-photos', serviceId],
    queryFn: async () => {
      const response = await apiRequest(`/api/service-photos?serviceId=${serviceId}`);
      return response as ServicePhoto[];
    },
    enabled: !!serviceId
  });

  // Debug logging za API poziv
  console.log('🔧 ServicePhotos API state - isLoading:', isLoading, 'error:', error, 'photos:', photos, 'photos.length:', Array.isArray(photos) ? photos.length : 'NOT_ARRAY');
  
  // Debug specific photo URLs
  if (Array.isArray(photos) && photos.length > 0) {
    photos.forEach((photo: ServicePhoto) => {
      console.log('🖼️ Photo debug:', {
        id: photo.id,
        serviceId: photo.serviceId,
        photoUrl: photo.photoUrl,
        fullUrl: `${window.location.origin}${photo.photoUrl}`,
        photoCategory: photo.photoCategory
      });
    });
  }

  // Upload photo mutation
  const uploadMutation = useMutation({
    mutationFn: async (data: { photoUrl: string; category: string }) => {
      return apiRequest('/api/service-photos', {
        method: 'POST',
        body: JSON.stringify({
          serviceId,
          photoUrl: data.photoUrl,
          photoCategory: data.category,
          description: `Fotografija kategorije: ${PHOTO_CATEGORIES.find(c => c.value === data.category)?.label || data.category}`
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Fotografija dodana",
        description: "Fotografija je uspešno dodana u servis",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/service-photos', serviceId] });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri dodavanju fotografije",
        variant: "destructive",
      });
    },
  });

  // Delete photo mutation
  const deleteMutation = useMutation({
    mutationFn: (photoId: number) => {
      return apiRequest(`/api/service-photos/${photoId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: "Fotografija obrisana",
        description: "Fotografija je uspešno obrisana",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/service-photos', serviceId] });
      refetch();
      setSelectedPhoto(null);
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri brisanju fotografije",
        variant: "destructive",
      });
    },
  });

  // Handle file upload using standard HTML input
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    
    try {
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "Fajl previše veliki",
            description: `Fajl ${file.name} je veći od 10MB`,
            variant: "destructive",
          });
          continue;
        }

        // Create FormData for file upload
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('serviceId', serviceId.toString());
        formData.append('photoCategory', uploadCategory);
        formData.append('description', `Fotografija kategorije: ${PHOTO_CATEGORIES.find(c => c.value === uploadCategory)?.label || uploadCategory}`);

        // Upload directly to API
        const response = await fetch('/api/service-photos/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }
      }

      toast({
        title: "Fotografije dodane",
        description: "Sve fotografije su uspešno dodane u servis",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/service-photos', serviceId] });
      refetch();
      
    } catch (error: any) {
      toast({
        title: "Greška",
        description: error.message || "Greška pri dodavanju fotografija",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset input
      event.target.value = '';
    }
  };

  // Group photos by category - safe guard against undefined photos
  const photosArray = Array.isArray(photos) ? photos : [];
  const photosByCategory = photosArray.reduce((acc: Record<string, ServicePhoto[]>, photo: ServicePhoto) => {
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
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Dodaj nove fotografije
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Kategorija fotografije</label>
              <select 
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                {PHOTO_CATEGORIES.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="relative">
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
                id={`photo-upload-${serviceId}`}
              />
              <label 
                htmlFor={`photo-upload-${serviceId}`}
                className="flex items-center gap-2 justify-center py-4 px-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <span>Uploadovanje...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5" />
                    <span>Dodaj fotografije (max 10MB po slici)</span>
                  </>
                )}
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photos Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileImage className="h-5 w-5" />
            Fotografije servisa ({photosArray.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Debug section for troubleshooting */}
          {serviceId === 217 && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold text-yellow-800 mb-2">🔧 Debug Info - Servis 217</h4>
              <p className="text-sm text-yellow-700">Photos array length: {photosArray.length}</p>
              <p className="text-sm text-yellow-700">Is loading: {isLoading ? 'Yes' : 'No'}</p>
              <p className="text-sm text-yellow-700">Error: {error ? 'Yes' : 'No'}</p>
              {photosArray.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-yellow-800">Fotografije:</p>
                  {photosArray.map(photo => (
                    <div key={photo.id} className="text-xs text-yellow-600 ml-2">
                      ID: {photo.id}, URL: {photo.photoUrl}, Category: {photo.photoCategory}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {photosArray.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Nema fotografija</p>
              <p className="text-sm">
                {showUpload && !readOnly 
                  ? "Dodajte prve fotografije koristeći upload dugme iznad"
                  : "Za ovaj servis još nisu dodane fotografije"
                }
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {PHOTO_CATEGORIES.map(category => {
                const categoryPhotos = photosByCategory[category.value] || [];
                if (categoryPhotos.length === 0) return null;

                return (
                  <div key={category.value}>
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className={category.color}>
                        {category.label} ({categoryPhotos.length})
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {categoryPhotos.map((photo) => (
                        <div key={photo.id} className="relative group">
                          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer"
                               onClick={() => setSelectedPhoto(photo)}>
                            <img 
                              src={photo.photoUrl.startsWith('http') ? photo.photoUrl : `${window.location.origin}${photo.photoUrl}`}
                              alt={photo.description || 'Service photo'}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                              onLoad={(e) => {
                                const target = e.target as HTMLImageElement;
                                console.log('🖼️ Image loaded successfully:', {
                                  photoId: photo.id,
                                  originalUrl: photo.photoUrl,
                                  finalUrl: target.src,
                                  naturalWidth: target.naturalWidth,
                                  naturalHeight: target.naturalHeight
                                });
                              }}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                const attemptedUrl = photo.photoUrl.startsWith('http') ? photo.photoUrl : `${window.location.origin}${photo.photoUrl}`;
                                console.error('❌ Image failed to load:', {
                                  photoId: photo.id,
                                  originalUrl: photo.photoUrl,
                                  attemptedUrl: attemptedUrl,
                                  error: 'Failed to load image'
                                });
                                // Try alternative URL format
                                const alternativeUrl = photo.photoUrl.startsWith('/') ? 
                                  `https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev${photo.photoUrl}` : 
                                  photo.photoUrl;
                                if (target.src !== alternativeUrl) {
                                  console.log('🔄 Trying alternative URL:', alternativeUrl);
                                  target.src = alternativeUrl;
                                } else {
                                  target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23f3f4f6"/><text x="100" y="100" text-anchor="middle" dy=".3em" fill="%236b7280" font-family="sans-serif">Fotografija nedostupna</text></svg>';
                                }
                              }}
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                              <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                            </div>
                          </div>
                          
                          {!readOnly && (
                            <Button
                              variant="destructive"
                              size="sm"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteMutation.mutate(photo.id);
                              }}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}

                          <div className="mt-2 space-y-1">
                            <p className="text-xs text-gray-600 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(photo.uploadedAt).toLocaleDateString('sr-RS')}
                            </p>
                            {photo.fileSize && (
                              <p className="text-xs text-gray-500">
                                {(photo.fileSize / 1024 / 1024).toFixed(1)} MB
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo Preview Dialog */}
      {selectedPhoto && (
        <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileImage className="h-5 w-5" />
                Pregled fotografije
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={PHOTO_CATEGORIES.find(c => c.value === selectedPhoto.photoCategory)?.color || 'bg-gray-100 text-gray-800'}>
                  {PHOTO_CATEGORIES.find(c => c.value === selectedPhoto.photoCategory)?.label || selectedPhoto.photoCategory}
                </Badge>
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(selectedPhoto.uploadedAt).toLocaleDateString('sr-RS', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>

              <div className="w-full bg-gray-50 rounded-lg overflow-hidden">
                <img 
                  src={selectedPhoto.photoUrl.startsWith('http') ? selectedPhoto.photoUrl : `${window.location.origin}${selectedPhoto.photoUrl}`}
                  alt={selectedPhoto.description || 'Service photo'}
                  className="w-full h-auto max-h-[60vh] object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%23f3f4f6"/><text x="200" y="150" text-anchor="middle" dy=".3em" fill="%236b7280" font-family="sans-serif" font-size="16">Fotografija nedostupna</text></svg>';
                  }}
                />
              </div>

              {selectedPhoto.description && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Opis:</h4>
                  <p className="text-sm text-gray-700">{selectedPhoto.description}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-xs text-gray-500 space-y-1">
                  {selectedPhoto.fileName && <p>Naziv fajla: {selectedPhoto.fileName}</p>}
                  {selectedPhoto.fileSize && (
                    <p>Veličina: {(selectedPhoto.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                  )}
                </div>
                
                {!readOnly && (
                  <Button
                    variant="destructive"
                    onClick={() => deleteMutation.mutate(selectedPhoto.id)}
                    disabled={deleteMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Obriši fotografiju
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}