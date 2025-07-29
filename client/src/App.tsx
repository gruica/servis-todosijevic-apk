import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import React, { useEffect } from "react";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import BusinessPartnerAuthPage from "@/pages/business-partner-auth";
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import ClientDetails from "@/pages/client-details";
import Services from "@/pages/services";
import SimplifiedServices from "@/pages/simplified-services";
import BasicServicesPage from "@/pages/basic/services";
import EnhancedServices from "@/pages/enhanced-services";
import AdminServices from "@/pages/admin/services";
import CreateService from "@/pages/admin/create-service";
import AdminSpareParts from "@/pages/admin/spare-parts";
import AdminAvailableParts from "@/pages/admin/available-parts";
import AdminSparePartsCatalogPage from "@/pages/admin/spare-parts-catalog";
import AdminWebScrapingPage from "@/pages/admin/web-scraping";
import Appliances from "@/pages/appliances";
import Users from "@/pages/users";
import UserProfile from "@/pages/user-profile";
import TechnicianServicesMobile from "@/pages/technician/services-mobile";
import TechnicianProfile from "@/pages/technician/profile";
import TechnicianMyProfile from "@/pages/technician/my-profile";
import TechnicianNotifications from "@/pages/technician/notifications";
import TechnicianSettings from "@/pages/technician/settings";
import TechnicianHelp from "@/pages/technician/help";
import TechnicianContact from "@/pages/technician/contact";
import TechnicianServicesList from "@/pages/technician-services";
import CreateTechnicianUser from "@/pages/create-technician-user";
import MaintenanceSchedules from "@/pages/maintenance-schedules";
import EmailSettings from "@/pages/email-settings";

import SQLAdmin from "@/pages/sql-admin";
import ExcelImportExport from "@/pages/excel-import-export";
import ExcelImport from "@/pages/admin/excel-import";
import UserVerification from "@/pages/admin/user-verification";
// SMS functionality has been completely removed from the application
import { ProtectedRoute } from "./lib/protected-route";
import { RoleProtectedRoute } from "./lib/role-protected-route";
import { initializeCapacitor, isNativeMobile } from "./capacitor";
import { NotificationProvider } from "@/contexts/notification-context";

// Import customer pages
import CustomerServiceRequest from "@/pages/customer";
import CustomerProfile from "@/pages/customer/profile";
import CustomerServices from "@/pages/customer/services";

// Import business partner pages
import BusinessDashboard from "@/pages/business";
import BusinessProfile from "@/pages/business/profile";
import BusinessServices from "@/pages/business/services";
import NewBusinessServiceRequest from "@/pages/business/services/new";
import EditBusinessService from "@/pages/business/services/edit.tsx";
import NewBusinessClient from "@/pages/business/clients/new";
import BusinessMessages from "@/pages/business/messages";
import BusinessComplus from "@/pages/business/complus";

// Import the new HomePage
import HomePage from "@/pages/home-page";
import DiagnosticsPage from "@/pages/diagnostics";

import DiagnosticServicesPage from "@/pages/diagnostic-services";
import SystemDiagnostics from "@/pages/system-diagnostics";
import EmailVerificationDemo from "@/pages/email-verification-demo";

import DataExportPage from "@/pages/admin/data-export";
import SMSMobileAPIConfigPage from "@/pages/admin/sms-mobile-api-config";
import SMSBulkPage from "@/pages/admin/sms-bulk";
import ComplusBillingPage from "@/pages/admin/complus-billing";
import BusinessPartnersAdminPage from "@/pages/admin/business-partners";
import ComplusDashboard from "@/pages/complus";
import ComplusAuthPage from "@/pages/complus-auth";

function Router() {
  return (
    <Switch>
      {/* Public home page - novi javni homepage za sve korisnike */}
      <Route path="/" component={HomePage} />
      
      {/* Dijagnostičke stranice - javno dostupne za lakše otklanjanje grešaka */}
      <Route path="/diagnostics" component={DiagnosticsPage} />
      <Route path="/diagnostic-services" component={DiagnosticServicesPage} />
      <Route path="/system-diagnostics" component={SystemDiagnostics} />

      <Route path="/email-verification-demo" component={EmailVerificationDemo} />
      
      <Route path="/auth" component={AuthPage} />
      <Route path="/business-auth" component={BusinessPartnerAuthPage} />
      <Route path="/complus-auth" component={ComplusAuthPage} />
      
      {/* Admin routes */}
      <RoleProtectedRoute path="/admin" component={Dashboard} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/clients" component={Clients} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/clients/:id" component={ClientDetails} allowedRoles={["admin"]} />
      {/* Admin verzija servisa - zaštićena */}
      <RoleProtectedRoute path="/admin/services" component={AdminServices} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/admin/create-service" component={CreateService} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/admin/spare-parts" component={AdminSpareParts} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/admin/available-parts" component={AdminAvailableParts} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/admin/business-partners" component={BusinessPartnersAdminPage} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/admin/spare-parts-catalog" component={AdminSparePartsCatalogPage} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/admin/web-scraping" component={AdminWebScrapingPage} allowedRoles={["admin"]} />
      {/* Javne verzije servisa za testiranje */}
      <Route path="/services" component={EnhancedServices} />
      <Route path="/services-basic" component={BasicServicesPage} />
      <Route path="/services-alt" component={SimplifiedServices} />
      <Route path="/services-safe" component={React.lazy(() => import('@/pages/services-safe'))} />
      <RoleProtectedRoute path="/appliances" component={Appliances} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/users" component={Users} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/create-tech-user" component={CreateTechnicianUser} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/technician-services" component={TechnicianServicesList} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/maintenance-schedules" component={MaintenanceSchedules} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/email-settings" component={EmailSettings} allowedRoles={["admin"]} />

      <RoleProtectedRoute path="/sql-admin" component={SQLAdmin} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/excel" component={ExcelImportExport} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/admin/excel-import" component={ExcelImport} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/admin/user-verification" component={UserVerification} allowedRoles={["admin"]} />

      <RoleProtectedRoute path="/admin/sms-mobile-api-config" component={SMSMobileAPIConfigPage} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/admin/sms-bulk" component={SMSBulkPage} allowedRoles={["admin"]} />

      <RoleProtectedRoute path="/admin/data-export" component={DataExportPage} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/admin/complus-billing" component={ComplusBillingPage} allowedRoles={["admin"]} />
      
      {/* Com Plus nezavisan administrativni panel */}
      <RoleProtectedRoute path="/complus" component={ComplusDashboard} allowedRoles={["admin", "complus_admin"]} />
      
      <RoleProtectedRoute path="/profile" component={UserProfile} allowedRoles={["admin"]} />
      

      
      {/* Technician routes */}
      <RoleProtectedRoute path="/tech" component={TechnicianServicesMobile} allowedRoles={["technician"]} />
      <RoleProtectedRoute path="/tech/profile" component={TechnicianProfile} allowedRoles={["technician"]} />
      <RoleProtectedRoute path="/tech/my-profile" component={TechnicianMyProfile} allowedRoles={["technician"]} />
      <RoleProtectedRoute path="/tech/notifications" component={TechnicianNotifications} allowedRoles={["technician"]} />
      <RoleProtectedRoute path="/tech/settings" component={TechnicianSettings} allowedRoles={["technician"]} />
      <RoleProtectedRoute path="/tech/help" component={TechnicianHelp} allowedRoles={["technician"]} />
      <RoleProtectedRoute path="/tech/contact" component={TechnicianContact} allowedRoles={["technician"]} />
      
      {/* Customer routes */}
      <RoleProtectedRoute path="/customer" component={CustomerServiceRequest} allowedRoles={["customer"]} />
      <RoleProtectedRoute path="/customer/profile" component={CustomerProfile} allowedRoles={["customer"]} />
      <RoleProtectedRoute path="/customer/services" component={CustomerServices} allowedRoles={["customer"]} />
      
      {/* Business Partner routes */}
      <RoleProtectedRoute path="/business" component={BusinessDashboard} allowedRoles={["business_partner", "business"]} />
      <RoleProtectedRoute path="/business/profile" component={BusinessProfile} allowedRoles={["business_partner", "business"]} />
      <RoleProtectedRoute path="/business/services" component={BusinessServices} allowedRoles={["business_partner", "business"]} />
      <RoleProtectedRoute path="/business/services/new" component={NewBusinessServiceRequest} allowedRoles={["business_partner", "business"]} />
      <RoleProtectedRoute path="/business/services/edit/:id" component={EditBusinessService} allowedRoles={["business_partner", "business"]} />
      <RoleProtectedRoute path="/business/clients/new" component={NewBusinessClient} allowedRoles={["business_partner", "business"]} />
      <RoleProtectedRoute path="/business/messages" component={BusinessMessages} allowedRoles={["business_partner", "business"]} />
      <RoleProtectedRoute path="/business/complus" component={BusinessComplus} allowedRoles={["business_partner", "business"]} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [, navigate] = useLocation();
  
  // Provera da li postoji zahtev za odjavom, i ako postoji, automatski odradi redirekt
  useEffect(() => {
    const logoutRequested = localStorage.getItem("logoutRequested");
    if (logoutRequested === "true") {
      console.log("Detektovan zahtev za odjavom, preusmeravanje na stranicu za prijavu");
      localStorage.removeItem("logoutRequested");
      navigate("/auth");
    }
  }, [navigate]);
  
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

  // Viewport optimizacija za Android tastature
  useEffect(() => {
    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    setVh();
    
    const handleResize = () => {
      setVh();
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return (
    <NotificationProvider>
      <Router />
      <Toaster />
    </NotificationProvider>
  );
}

export default App;
