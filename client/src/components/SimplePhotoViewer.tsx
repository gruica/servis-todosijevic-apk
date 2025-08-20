import React, { useState, useEffect } from 'react';

interface Photo {
  id: number;
  photoUrl: string;
  photoCategory: string;
  description?: string;
  uploadedAt?: string;
}

interface SimplePhotoViewerProps {
  serviceId: number;
}

export function SimplePhotoViewer({ serviceId }: SimplePhotoViewerProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log('🔧 SimplePhotoViewer rendered for serviceId:', serviceId);

  useEffect(() => {
    loadPhotos();
  }, [serviceId]);

  const loadPhotos = async () => {
    console.log('🔄 SimplePhotoViewer loading photos for serviceId:', serviceId);
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/service-photos?serviceId=${serviceId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ SimplePhotoViewer loaded photos:', data);
      setPhotos(data);
    } catch (err: any) {
      console.error('❌ SimplePhotoViewer error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  console.log('🎨 SimplePhotoViewer state:', { loading, error, photosCount: photos.length });

  if (loading) {
    return (
      <div style={{ 
        border: '1px solid #ddd', 
        padding: '20px', 
        borderRadius: '8px',
        backgroundColor: '#f9f9f9'
      }}>
        <h3>📷 Fotografije servisa (Loading...)</h3>
        <p>Učitavanje fotografija...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        border: '1px solid #ff6b6b', 
        padding: '20px', 
        borderRadius: '8px',
        backgroundColor: '#ffe0e0'
      }}>
        <h3>📷 Fotografije servisa (Error)</h3>
        <p style={{ color: 'red' }}>Greška: {error}</p>
        <button onClick={loadPhotos} style={{ marginTop: '10px' }}>
          Pokušaj ponovo
        </button>
      </div>
    );
  }

  return (
    <div style={{ 
      border: '1px solid #4CAF50', 
      padding: '20px', 
      borderRadius: '8px',
      backgroundColor: '#f0fff0'
    }}>
      <h3>📷 Fotografije servisa ({photos.length})</h3>
      
      {photos.length === 0 ? (
        <p>Nema fotografija za ovaj servis.</p>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
          gap: '15px',
          marginTop: '15px'
        }}>
          {photos.map((photo) => (
            <div key={photo.id} style={{ 
              border: '1px solid #ddd', 
              borderRadius: '8px', 
              overflow: 'hidden',
              backgroundColor: 'white'
            }}>
              <img
                src={photo.photoUrl}
                alt={photo.description || 'Fotografija'}
                style={{ 
                  width: '100%', 
                  height: '150px', 
                  objectFit: 'cover',
                  display: 'block'
                }}
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.src = '/api/placeholder/200x150?text=Foto+nedostaje';
                }}
              />
              <div style={{ padding: '10px' }}>
                <p style={{ 
                  margin: '0 0 5px 0', 
                  fontSize: '12px', 
                  fontWeight: 'bold',
                  color: '#666'
                }}>
                  {photo.photoCategory}
                </p>
                <p style={{ 
                  margin: '0', 
                  fontSize: '11px', 
                  color: '#888'
                }}>
                  {photo.description || 'Bez opisa'}
                </p>
                {photo.uploadedAt && (
                  <p style={{ 
                    margin: '5px 0 0 0', 
                    fontSize: '10px', 
                    color: '#aaa'
                  }}>
                    {new Date(photo.uploadedAt).toLocaleDateString('sr-RS')}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div style={{ marginTop: '15px', fontSize: '12px', color: '#666' }}>
        🔍 Debug: serviceId={serviceId}, loading={loading ? 'true' : 'false'}, error={error || 'none'}
      </div>
    </div>
  );
}