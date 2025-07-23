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
import NewBusinessClient from "@/pages/business/clients/new";

// Import the new HomePage
import HomePage from "@/pages/home-page";
import DiagnosticsPage from "@/pages/diagnostics";
import OCRTestPage from "@/pages/ocr-test";
import DiagnosticServicesPage from "@/pages/diagnostic-services";
import SystemDiagnostics from "@/pages/system-diagnostics";
import EmailVerificationDemo from "@/pages/email-verification-demo";
import AdminCleanup from "@/pages/admin-cleanup";
import DataExportPage from "@/pages/admin/data-export";
import SMSMobileAPIConfigPage from "@/pages/admin/sms-mobile-api-config";
import SMSBulkPage from "@/pages/admin/sms-bulk";

function Router() {
  return (
    <Switch>
      {/* Public home page - novi javni homepage za sve korisnike */}
      <Route path="/" component={HomePage} />
      
      {/* Dijagnostičke stranice - javno dostupne za lakše otklanjanje grešaka */}
      <Route path="/diagnostics" component={DiagnosticsPage} />
      <Route path="/diagnostic-services" component={DiagnosticServicesPage} />
      <Route path="/system-diagnostics" component={SystemDiagnostics} />
      <Route path="/services-debug" component={React.lazy(() => import('@/pages/services-debug'))} />
      <Route path="/email-verification-demo" component={EmailVerificationDemo} />
      
      <Route path="/auth" component={AuthPage} />
      <Route path="/business-auth" component={BusinessPartnerAuthPage} />
      
      {/* Admin routes */}
      <RoleProtectedRoute path="/admin" component={Dashboard} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/clients" component={Clients} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/clients/:id" component={ClientDetails} allowedRoles={["admin"]} />
      {/* Admin verzija servisa - zaštićena */}
      <RoleProtectedRoute path="/admin/services" component={AdminServices} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/admin/create-service" component={CreateService} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/admin/spare-parts" component={AdminSpareParts} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/admin/available-parts" component={AdminAvailableParts} allowedRoles={["admin"]} />
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
      <RoleProtectedRoute path="/email-test" component={EmailTest} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/sql-admin" component={SQLAdmin} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/excel" component={ExcelImportExport} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/admin/excel-import" component={ExcelImport} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/admin/user-verification" component={UserVerification} allowedRoles={["admin"]} />

      <RoleProtectedRoute path="/admin/sms-mobile-api-config" component={SMSMobileAPIConfigPage} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/admin/sms-bulk" component={SMSBulkPage} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/admin/cleanup" component={AdminCleanup} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/admin/data-export" component={DataExportPage} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/profile" component={UserProfile} allowedRoles={["admin"]} />
      
      {/* OCR Test route - accessible to admin and technician */}
      <RoleProtectedRoute path="/ocr-test" component={OCRTestPage} allowedRoles={["admin", "technician"]} />
      
      {/* Technician routes */}
      <RoleProtectedRoute path="/tech" component={TechnicianServices} allowedRoles={["technician"]} />
      <RoleProtectedRoute path="/tech/profile" component={TechnicianProfile} allowedRoles={["technician"]} />
      
      {/* Customer routes */}
      <RoleProtectedRoute path="/customer" component={CustomerServiceRequest} allowedRoles={["customer"]} />
      <RoleProtectedRoute path="/customer/profile" component={CustomerProfile} allowedRoles={["customer"]} />
      <RoleProtectedRoute path="/customer/services" component={CustomerServices} allowedRoles={["customer"]} />
      
      {/* Business Partner routes */}
      <RoleProtectedRoute path="/business" component={BusinessDashboard} allowedRoles={["business_partner", "business"]} />
      <RoleProtectedRoute path="/business/profile" component={BusinessProfile} allowedRoles={["business_partner", "business"]} />
      <RoleProtectedRoute path="/business/services" component={BusinessServices} allowedRoles={["business_partner", "business"]} />
      <RoleProtectedRoute path="/business/services/new" component={NewBusinessServiceRequest} allowedRoles={["business_partner", "business"]} />
      <RoleProtectedRoute path="/business/clients/new" component={NewBusinessClient} allowedRoles={["business_partner", "business"]} />
      
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
