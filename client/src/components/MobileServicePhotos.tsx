import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Camera, Upload, Eye, Trash2, Calendar, Image, Plus, Loader2, Wifi, WifiOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

interface MobileServicePhotosProps {
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

export function MobileServicePhotos({ serviceId, readOnly = false, showUpload = true }: MobileServicePhotosProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<ServicePhoto | null>(null);
  const [uploadCategory, setUploadCategory] = useState('before');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [offlinePhotos, setOfflinePhotos] = useState<File[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Monitor network status
  useState(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Konekcija uspostavljena",
        description: "Možete nastaviti sa upload-om fotografija",
      });
      uploadOfflinePhotos();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Nema interneta",
        description: "Fotografije će biti sačuvane lokalno",
        variant: "destructive",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  });

  // Fetch service photos
  const { data: photos = [], isLoading, refetch } = useQuery<ServicePhoto[]>({
    queryKey: ['/api/service-photos', serviceId],
    queryFn: () => apiRequest(`/api/service-photos?serviceId=${serviceId}`),
    enabled: !!serviceId && isOnline
  });

  // Upload photo mutation using Base64 (zaobilazi multer probleme)
  const uploadMutation = useMutation({
    mutationFn: async (data: { file: File; category: string }) => {
      setUploadProgress(10);
      
      console.log('[BASE64 UPLOAD] Pokušavam upload fotografije...', {
        serviceId,
        category: data.category,
        fileSize: data.file.size
      });

      // Convert file to base64
      const convertToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
        });
      };

      setUploadProgress(30);

      const base64Data = await convertToBase64(data.file);
      console.log('[BASE64 UPLOAD] Fajl konvertovan u base64, veličina:', base64Data.length);

      setUploadProgress(50);

      // Use apiRequest with proper JWT token handling (JSON request)
      const uploadData = {
        base64Data,
        serviceId: serviceId.toString(),
        photoCategory: data.category,
        description: `Mobilna fotografija: ${PHOTO_CATEGORIES.find(c => c.value === data.category)?.label || data.category}`,
        filename: data.file.name
      };

      setUploadProgress(70);

      // Log auth token za debugging
      const token = localStorage.getItem('jwt-token');
      console.log('[BASE64 UPLOAD] JWT token exists:', !!token);
      console.log('[BASE64 UPLOAD] JWT token length:', token?.length);

      const result = await apiRequest('/api/simple-photo-upload', {
        method: 'POST',
        body: JSON.stringify(uploadData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      setUploadProgress(100);
      console.log('[BASE64 UPLOAD] Upload uspešan:', result);
      return result;
    },
    onSuccess: () => {
      toast({
        title: "📸 Fotografija dodana",
        description: "Fotografija je uspešno uploadovana",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/service-photos', serviceId] });
      refetch();
      setUploadProgress(0);
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri upload-u fotografije",
        variant: "destructive",
      });
      setUploadProgress(0);
    },
    onSettled: () => {
      setIsUploading(false);
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

  // Handle file upload from camera or gallery
  const handleFileCapture = async (event: React.ChangeEvent<HTMLInputElement>, isCamera: boolean = false) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Fajl je prevelik",
        description: "Maksimalna veličina fotografije je 10MB",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Neispravna vrsta fajla",
        description: "Molimo izaberite fotografiju",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    // If offline, save to offline cache
    if (!isOnline) {
      setOfflinePhotos(prev => [...prev, file]);
      toast({
        title: "📱 Fotografija sačuvana",
        description: "Biće uploadovana kada se konekcija uspostavi",
      });
      setIsUploading(false);
      return;
    }

    // Upload immediately if online
    uploadMutation.mutate({ file, category: uploadCategory });
  };

  // Upload offline photos when connection restored
  const uploadOfflinePhotos = async () => {
    if (offlinePhotos.length === 0) return;

    for (const file of offlinePhotos) {
      try {
        await uploadMutation.mutateAsync({ file, category: uploadCategory });
      } catch (error) {
        console.error('Failed to upload offline photo:', error);
      }
    }
    
    setOfflinePhotos([]);
    toast({
      title: "📤 Sve fotografije uploadovane",
      description: `${offlinePhotos.length} fotografije uspešno poslane`,
    });
  };

  // Trigger camera capture
  const handleCameraCapture = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  // Trigger gallery selection
  const handleGallerySelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Group photos by category
  const photosByCategory = photos.reduce((acc: Record<string, ServicePhoto[]>, photo: ServicePhoto) => {
    const category = photo.photoCategory || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(photo);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Network Status Indicator */}
      <div className={`flex items-center gap-2 p-2 rounded-lg ${isOnline ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
        {isOnline ? (
          <>
            <Wifi className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-700">Online - fotografije se upload-uju odmah</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-700">Offline - fotografije će biti sačuvane lokalno</span>
          </>
        )}
        {offlinePhotos.length > 0 && (
          <Badge variant="secondary" className="ml-auto">
            {offlinePhotos.length} čeka upload
          </Badge>
        )}
      </div>

      {/* Mobile Upload Controls */}
      {showUpload && !readOnly && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Camera className="h-5 w-5" />
              Dodaj fotografije
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Category Selection */}
            <div>
              <Label className="text-sm font-medium mb-2">Kategorija fotografije</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PHOTO_CATEGORIES.map(category => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Hidden file inputs */}
            <Input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handleFileCapture(e, true)}
              className="hidden"
            />
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileCapture(e, false)}
              className="hidden"
            />
            
            {/* Mobile Upload Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleCameraCapture}
                disabled={isUploading}
                className="h-16 bg-blue-600 hover:bg-blue-700 text-white flex flex-col items-center gap-1"
              >
                <Camera className="h-6 w-6" />
                <span className="text-sm">Fotografiši</span>
              </Button>
              
              <Button
                onClick={handleGallerySelect}
                disabled={isUploading}
                variant="outline"
                className="h-16 border-blue-200 text-blue-700 hover:bg-blue-50 flex flex-col items-center gap-1"
              >
                <Image className="h-6 w-6" />
                <span className="text-sm">Galerija</span>
              </Button>
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="text-sm text-gray-600">Upload u toku... {uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Display Photos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Fotografije servisa ({photos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {photos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Camera className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Nema fotografija za ovaj servis</p>
              {showUpload && !readOnly && (
                <p className="text-sm mt-1">Dodajte fotografije pomoću dugmića iznad</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(photosByCategory).map(([category, categoryPhotos]) => {
                const categoryInfo = PHOTO_CATEGORIES.find(c => c.value === category);
                return (
                  <div key={category}>
                    <Badge className={`${categoryInfo?.color || 'bg-gray-100 text-gray-800'} mb-3`}>
                      {categoryInfo?.label || category} ({(categoryPhotos as ServicePhoto[]).length})
                    </Badge>
                    <div className="grid grid-cols-2 gap-3">
                      {(categoryPhotos as ServicePhoto[]).map((photo: ServicePhoto) => (
                        <div
                          key={photo.id}
                          className="relative group cursor-pointer bg-gray-100 rounded-lg overflow-hidden aspect-square"
                          onClick={() => setSelectedPhoto(photo)}
                        >
                          <img 
                            src={photo.photoUrl} 
                            alt={photo.description || 'Service photo'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23f3f4f6"/><text x="100" y="100" text-anchor="middle" dy=".3em" fill="%236b7280" font-family="sans-serif" font-size="12">Slika nedostupna</text></svg>';
                            }}
                          />
                          
                          {!readOnly && (
                            <Button
                              variant="destructive"
                              size="sm"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteMutation.mutate(photo.id);
                              }}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}

                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2">
                            <p className="text-xs flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(photo.uploadedAt).toLocaleDateString('sr-RS')}
                            </p>
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
          <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-auto p-2">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
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
                  src={selectedPhoto.photoUrl} 
                  alt={selectedPhoto.description || 'Service photo'}
                  className="w-full h-auto max-h-[70vh] object-contain"
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
                  {selectedPhoto.fileName && <p>Fajl: {selectedPhoto.fileName}</p>}
                  {selectedPhoto.fileSize && (
                    <p>Veličina: {(selectedPhoto.fileSize / 1024 / 1024).toFixed(1)} MB</p>
                  )}
                </div>
                {!readOnly && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      deleteMutation.mutate(selectedPhoto.id);
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Obriši
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