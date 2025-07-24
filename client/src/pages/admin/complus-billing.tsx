import { AdminLayout } from "@/components/layout/admin-layout";
import ComplusBillingReport from "@/components/admin/ComplusBillingReport";

export default function ComplusBillingPage() {
  return (
    <AdminLayout>
      <div className="p-6">
        <ComplusBillingReport />
      </div>
    </AdminLayout>
  );
}