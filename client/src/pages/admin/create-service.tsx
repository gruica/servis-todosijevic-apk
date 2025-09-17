import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { AdminLayout } from "@/components/layout/admin-layout";
import { QuickServiceEntry } from "@/components/quick-service-entry";

export default function CreateService() {
  const [, setLocation] = useLocation();
  const [isFloatingOpen, setIsFloatingOpen] = useState(false);

  // Auto-open floating component when page loads
  useEffect(() => {
    setIsFloatingOpen(true);
  }, []);

  const handleServiceCreated = () => {
    // After service is created, navigate back to services list
    setLocation("/admin/services");
  };

  const handleClose = () => {
    // If user closes without creating, go back to services list
    setLocation("/admin/services");
  };

  return (
    <AdminLayout>
      {/* QuickServiceEntry floating component - opens automatically in admin mode */}
      <QuickServiceEntry
        mode="admin"
        isOpen={isFloatingOpen}
        onClose={handleClose}
        onServiceCreated={handleServiceCreated}
      />
    </AdminLayout>
  );
}