import React, { Suspense, startTransition, useState, useEffect } from 'react';
import { AdminLayout } from "@/components/layout/admin-layout";
import SparePartsCatalog from "@/components/admin/SparePartsCatalog";
import { ErrorBoundary } from '@/components/error-boundary';

function CatalogLoader() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    startTransition(() => {
      setIsReady(true);
    });
  }, []);

  if (!isReady) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Katalog rezervnih delova</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-lg">Učitavam katalog rezervnih delova...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Katalog rezervnih delova</h1>
      </div>
      <SparePartsCatalog />
    </div>
  );
}

export default function AdminSparePartsCatalogPage() {
  return (
    <AdminLayout>
      <ErrorBoundary>
        <Suspense fallback={
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold tracking-tight">Katalog rezervnih delova</h1>
            </div>
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-lg">Inicijalizujem sistem...</span>
            </div>
          </div>
        }>
          <CatalogLoader />
        </Suspense>
      </ErrorBoundary>
    </AdminLayout>
  );
}