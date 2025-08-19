// Jednostavna test stranica za debugging fotografija
import { useState } from "react";
import { PhotoDebugTest } from "@/components/PhotoDebugTest";
import { ServicePhotos } from "@/components/ServicePhotos";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestPhotoPage() {
  const [testServiceId, setTestServiceId] = useState<number>(217);
  
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Test fotografija - Servis {testServiceId}</h1>
          <div className="flex gap-2">
            <Button onClick={() => setTestServiceId(217)}>Test 217</Button>
            <Button onClick={() => setTestServiceId(232)}>Test 232</Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>🔧 Debug komponenta</CardTitle>
          </CardHeader>
          <CardContent>
            <PhotoDebugTest serviceId={testServiceId} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📷 ServicePhotos komponenta</CardTitle>
          </CardHeader>
          <CardContent>
            <ServicePhotos 
              serviceId={testServiceId}
              readOnly={false}
              showUpload={true}
            />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}