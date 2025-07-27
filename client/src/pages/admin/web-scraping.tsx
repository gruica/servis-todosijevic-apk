import { AdminLayout } from "@/components/layout/admin-layout";
import { WebScrapingDashboard } from "@/components/admin/WebScrapingDashboard";

export default function AdminWebScrapingPage() {
  return (
    <AdminLayout>
      <WebScrapingDashboard />
    </AdminLayout>
  );
}