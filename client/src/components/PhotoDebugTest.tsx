import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

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

export function PhotoDebugTest({ serviceId }: { serviceId: number }) {
  const { data: photos = [], isLoading, error } = useQuery<ServicePhoto[]>({
    queryKey: ['/api/service-photos', serviceId],
    queryFn: async () => {
      const response = await apiRequest(`/api/service-photos?serviceId=${serviceId}`);
      return response as ServicePhoto[];
    },
    enabled: !!serviceId
  });

  console.log('🔍 PhotoDebugTest - serviceId:', serviceId);
  console.log('🔍 PhotoDebugTest - isLoading:', isLoading);
  console.log('🔍 PhotoDebugTest - error:', error);
  console.log('🔍 PhotoDebugTest - photos:', photos);
  const photosArray = Array.isArray(photos) ? photos : [];
  console.log('🔍 PhotoDebugTest - photos length:', photosArray.length);
  console.log('🔍 PhotoDebugTest - photos type:', typeof photos);
  console.log('🔍 PhotoDebugTest - photos isArray:', Array.isArray(photos));

  if (isLoading) {
    return <div className="p-4 bg-yellow-100">⏳ Učitavanje fotografija...</div>;
  }

  if (error) {
    return <div className="p-4 bg-red-100 text-red-700">❌ Greška: {error instanceof Error ? error.message : String(error)}</div>;
  }

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="font-semibold mb-2">🔧 DEBUG INFO za servis {serviceId}</h3>
      <div className="text-sm space-y-1">
        <p><strong>Photos count:</strong> {photosArray.length}</p>
        <p><strong>Photos type:</strong> {typeof photos}</p>
        <p><strong>Is Array:</strong> {String(Array.isArray(photos))}</p>
        
        {photosArray.map((photo, index) => (
          <div key={photo.id} className="mt-2 p-2 bg-white rounded border">
            <p><strong>Photo {index + 1}:</strong></p>
            <p>ID: {photo.id}</p>
            <p>URL: {photo.photoUrl}</p>
            <p>Category: {photo.photoCategory}</p>
            <img 
              src={photo.photoUrl} 
              alt="Test" 
              className="w-20 h-20 object-cover mt-2 border"
              onLoad={() => console.log(`✅ Photo ${photo.id} loaded successfully`)}
              onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                console.error(`❌ Photo ${photo.id} failed to load:`, e);
                console.error(`❌ Failed URL: ${photo.photoUrl}`);
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}