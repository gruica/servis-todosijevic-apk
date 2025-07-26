import React from 'react';
import { AdminLayout } from "@/components/layout/admin-layout";
import SparePartsCatalog from "@/components/admin/SparePartsCatalog";
import { ErrorBoundary, AsyncWrapper } from '@/components/error-boundary';

export default function AdminSparePartsCatalogPage() {
  return (
    <AdminLayout>
      <ErrorBoundary>
        <AsyncWrapper>
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold tracking-tight">Katalog rezervnih delova</h1>
            </div>
            
            <SparePartsCatalog />
          </div>
        </AsyncWrapper>
      </ErrorBoundary>
    </AdminLayout>
  );
}