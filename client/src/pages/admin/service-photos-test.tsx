import { useState } from 'react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ServicePhotos } from '@/components/ServicePhotos';
import { Camera, TestTube } from 'lucide-react';

export default function ServicePhotosTest() {
  const [testServiceId, setTestServiceId] = useState<number>(1);
  const [inputValue, setInputValue] = useState<string>('1');

  const handleServiceIdChange = () => {
    const newId = parseInt(inputValue);
    if (newId && !isNaN(newId)) {
      setTestServiceId(newId);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <TestTube className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Service Photos Test</h1>
            <p className="text-gray-600">Test interface za fotografije servisa</p>
          </div>
        </div>

        {/* Service ID Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Odaberite servis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Input
                type="number"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Unesite ID servisa"
                className="max-w-xs"
                min="1"
              />
              <Button onClick={handleServiceIdChange} variant="outline">
                Prikaži fotografije
              </Button>
            </div>
            <p className="text-sm text-gray-600">
              Trenutno prikazuje fotografije za servis ID: <strong>{testServiceId}</strong>
            </p>
          </CardContent>
        </Card>

        {/* Service Photos Component */}
        <ServicePhotos 
          serviceId={testServiceId}
          readOnly={false}
          showUpload={true}
        />
      </div>
    </AdminLayout>
  );
}