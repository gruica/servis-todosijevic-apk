import { AdminLayout } from "@/components/layout/admin-layout";
import { SparePartsManagement } from "@/components/admin/SparePartsManagement";

export default function AdminSparePartsPage() {
  return (
    <AdminLayout>
      <SparePartsManagement />
    </AdminLayout>
  );
}