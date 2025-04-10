import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import BusinessPartnerAuthPage from "@/pages/business-partner-auth";
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import ClientDetails from "@/pages/client-details";
import Services from "@/pages/services";
import Appliances from "@/pages/appliances";
import Users from "@/pages/users";
import UserProfile from "@/pages/user-profile";
import TechnicianServices from "@/pages/technician/services";
import TechnicianProfile from "@/pages/technician/profile";
import TechnicianServicesList from "@/pages/technician-services";
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

// Import customer pages
import CustomerServiceRequest from "@/pages/customer";
import CustomerProfile from "@/pages/customer/profile";
import CustomerServices from "@/pages/customer/services";

// Import business partner pages
import BusinessDashboard from "@/pages/business";
import BusinessProfile from "@/pages/business/profile";
import BusinessServices from "@/pages/business/services";
import NewBusinessServiceRequest from "@/pages/business/services/new";

// Import the new HomePage
import HomePage from "@/pages/home-page";

function Router() {
  return (
    <Switch>
      {/* Public home page - novi javni homepage za sve korisnike */}
      <Route path="/" component={HomePage} />
      
      <Route path="/auth" component={AuthPage} />
      <Route path="/business-auth" component={BusinessPartnerAuthPage} />
      
      {/* Admin routes */}
      <RoleProtectedRoute path="/admin" component={Dashboard} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/clients" component={Clients} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/clients/:id" component={ClientDetails} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/services" component={Services} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/appliances" component={Appliances} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/users" component={Users} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/create-tech-user" component={CreateTechnicianUser} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/technician-services" component={TechnicianServicesList} allowedRoles={["admin"]} />
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
      
      {/* Customer routes */}
      <RoleProtectedRoute path="/customer" component={CustomerServiceRequest} allowedRoles={["customer"]} />
      <RoleProtectedRoute path="/customer/profile" component={CustomerProfile} allowedRoles={["customer"]} />
      <RoleProtectedRoute path="/customer/services" component={CustomerServices} allowedRoles={["customer"]} />
      
      {/* Business Partner routes */}
      <RoleProtectedRoute path="/business" component={BusinessDashboard} allowedRoles={["business"]} />
      <RoleProtectedRoute path="/business/profile" component={BusinessProfile} allowedRoles={["business"]} />
      <RoleProtectedRoute path="/business/services" component={BusinessServices} allowedRoles={["business"]} />
      <RoleProtectedRoute path="/business/services/new" component={NewBusinessServiceRequest} allowedRoles={["business"]} />
      
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
