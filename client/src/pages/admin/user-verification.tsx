import React from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import UserVerificationPanel from "@/components/admin/UserVerificationPanel";
import { AdminErrorBoundary } from "@/utils/error-boundary";
import { useComponentLogger } from "@/utils/production-logger";

export default function UserVerificationPage() {
  const logger = useComponentLogger('UserVerificationPage');
  
  React.useEffect(() => {
    logger.info('UserVerificationPage učitan');
  }, []);

  return (
    <AdminErrorBoundary componentName="UserVerificationPage">
      <AdminLayout>
        <div className="container py-6 px-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Verifikacija korisnika</h2>
              <p className="text-muted-foreground">
                Upravljajte verifikacijom novih korisnika koji čekaju odobrenje
              </p>
            </div>
          </div>
          
          <UserVerificationPanel />
        </div>
      </AdminLayout>
    </AdminErrorBoundary>
  );
}