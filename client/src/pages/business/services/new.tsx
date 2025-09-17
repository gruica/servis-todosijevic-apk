import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import BusinessLayout from "@/components/layout/business-layout";
import { QuickServiceEntry } from "@/components/quick-service-entry";

export default function NewBusinessServiceRequest() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [isFloatingOpen, setIsFloatingOpen] = useState(false);

  // Auto-open floating component when page loads
  useEffect(() => {
    setIsFloatingOpen(true);
  }, []);

  const handleServiceCreated = () => {
    // After service is created, navigate back to services list
    navigate("/business/services");
  };

  const handleClose = () => {
    // If user closes without creating, go back to services list
    navigate("/business/services");
  };

  return (
    <BusinessLayout>
      {/* QuickServiceEntry floating component - opens automatically */}
      <QuickServiceEntry
        mode="business"
        isOpen={isFloatingOpen}
        onClose={handleClose}
        onServiceCreated={handleServiceCreated}
      />
    </BusinessLayout>
  );
}