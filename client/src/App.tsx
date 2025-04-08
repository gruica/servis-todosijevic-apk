import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import ClientDetails from "@/pages/client-details";
import Services from "@/pages/services";
import Appliances from "@/pages/appliances";
import Users from "@/pages/users";
import UserProfile from "@/pages/user-profile";
import TechnicianServices from "@/pages/technician/services";
import TechnicianProfile from "@/pages/technician/profile";
import CreateTechnicianUser from "@/pages/create-technician-user";
import MaintenanceSchedules from "@/pages/maintenance-schedules";
import EmailSettings from "@/pages/email-settings";
import EmailTest from "@/pages/email-test";
import SQLAdmin from "@/pages/sql-admin";
import ExcelImportExport from "@/pages/excel-import-export";
import ExcelImport from "@/pages/admin/excel-import";
import { ProtectedRoute } from "./lib/protected-route";
import { RoleProtectedRoute } from "./lib/role-protected-route";
import { initializeCapacitor, isNativeMobile } from "./capacitor";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      
      {/* Admin routes */}
      <RoleProtectedRoute path="/" component={Dashboard} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/clients" component={Clients} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/clients/:id" component={ClientDetails} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/services" component={Services} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/appliances" component={Appliances} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/users" component={Users} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/create-tech-user" component={CreateTechnicianUser} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/maintenance-schedules" component={MaintenanceSchedules} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/email-settings" component={EmailSettings} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/email-test" component={EmailTest} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/sql-admin" component={SQLAdmin} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/excel" component={ExcelImportExport} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/admin/excel-import" component={ExcelImport} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/profile" component={UserProfile} allowedRoles={["admin"]} />
      
      {/* Technician routes */}
      <RoleProtectedRoute path="/tech" component={TechnicianServices} allowedRoles={["technician"]} />
      <RoleProtectedRoute path="/tech/profile" component={TechnicianProfile} allowedRoles={["technician"]} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Inicijalizacija Capacitor-a prilikom učitavanja aplikacije
  useEffect(() => {
    // Inicijalizacija samo za nativne mobilne platforme
    if (isNativeMobile) {
      console.log("Inicijalizacija mobilne aplikacije...");
      initializeCapacitor().catch(error => {
        console.error("Greška pri inicijalizaciji mobilne aplikacije:", error);
      });
    }
  }, []);

  return (
    <>
      <Router />
      <Toaster />
    </>
  );
}

export default App;
