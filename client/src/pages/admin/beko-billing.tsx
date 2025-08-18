import { AdminLayout } from "@/components/layout/admin-layout";
import BekoBillingReport from "@/components/admin/BekoBillingReport";

export default function BekoBillingPage() {
  return (
    <AdminLayout>
      <div className="p-6">
        <BekoBillingReport />
      </div>
    </AdminLayout>
  );
}