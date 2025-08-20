import React, { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MobilePhotoUploader } from '@/components/MobilePhotoUploader';
import { ArrowLeft, Camera, FileText } from 'lucide-react';

export default function CameraUpload() {
  const [match, params] = useRoute('/mobile/camera/:serviceId');
  const [service, setService] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const serviceId = params?.serviceId ? parseInt(params.serviceId) : null;

  useEffect(() => {
    if (serviceId) {
      loadService();
    }
  }, [serviceId]);

  const loadService = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/services/${serviceId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const serviceData = await response.json();
        setService(serviceData);
      }
    } catch (error) {
      console.error('Error loading service:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoUploaded = (photo: any) => {
    console.log('Photo uploaded:', photo);
    // Could navigate back or show success message
  };

  const goBack = () => {
    window.history.back();
  };

  if (!serviceId || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Učitavam servis...</p>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-sm">
          <CardContent className="pt-6 text-center">
            <p className="text-red-600 mb-4">Servis nije pronađen</p>
            <Button onClick={goBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Nazad
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center p-4">
          <Button onClick={goBack} variant="ghost" size="sm">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="ml-3 flex-1">
            <h1 className="font-semibold">Fotografije servisa</h1>
            <p className="text-sm text-gray-600">
              #{service.id} - {service.client?.name}
            </p>
          </div>
        </div>
      </div>

      {/* Service Info */}
      <div className="p-4">
        <Card className="mb-4">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-gray-500 mt-1" />
              <div className="flex-1">
                <h3 className="font-medium">{service.appliance?.name}</h3>
                <p className="text-sm text-gray-600">{service.appliance?.manufacturer?.name}</p>
                <p className="text-sm text-gray-600 mt-1">
                  Status: <span className="font-medium">{service.status}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mobile Photo Uploader */}
        <MobilePhotoUploader
          serviceId={service.id}
          onPhotoUploaded={handlePhotoUploaded}
        />
      </div>
    </div>
  );
}