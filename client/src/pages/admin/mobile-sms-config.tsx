import React from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { MobileSMSConfig } from "@/components/admin/MobileSMSConfig";

export default function MobileSMSConfigPage() {
  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Mobile SMS API Konfiguracija</h1>
          <p className="text-muted-foreground mt-2">
            Konfiguracija Mobile SMS API servisa za slanje obaveštenja klijentima preko vašeg telefona
          </p>
        </div>
        <MobileSMSConfig />
      </div>
    </AdminLayout>
  );
}