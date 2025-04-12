import React from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import UserVerificationPanel from "@/components/admin/UserVerificationPanel";

export default function UserVerificationPage() {
  const pathInfo = window.location.pathname;
  console.log("UserVerificationPage učitan, putanja:", pathInfo);

  return (
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
        
        <div className="mb-4 p-2 bg-blue-50 text-blue-800 rounded">
          Trenutna putanja: {pathInfo}
        </div>
        
        <UserVerificationPanel />
      </div>
    </AdminLayout>
  );
}