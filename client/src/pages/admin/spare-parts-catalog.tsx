import React, { Suspense, startTransition } from 'react';
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const SparePartsCatalog = React.lazy(() => import("@/components/admin/SparePartsCatalog"));

function LoadingCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Učitavanje kataloga rezervnih delova...
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminSparePartsCatalogPage() {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    startTransition(() => {
      setMounted(true);
    });
  }, []);

  if (!mounted) {
    return (
      <AdminLayout>
        <LoadingCard />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Suspense fallback={<LoadingCard />}>
        <SparePartsCatalog />
      </Suspense>
    </AdminLayout>
  );
}