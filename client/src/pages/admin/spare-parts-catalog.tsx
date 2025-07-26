import React from 'react';
import { AdminLayout } from "@/components/layout/admin-layout";
import SimpleSparePartsCatalog from "@/components/admin/SimpleSparePartsCatalog";

export default function AdminSparePartsCatalogPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Katalog rezervnih delova</h1>
        </div>
        
        <SimpleSparePartsCatalog />
      </div>
    </AdminLayout>
  );
}