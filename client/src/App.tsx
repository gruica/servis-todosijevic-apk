import { Route, Switch } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useMobile, useMobileEnvironment } from "@/hooks/use-mobile";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import Appliances from "@/pages/appliances";
import Users from "@/pages/users";
import EmailSettings from "@/pages/email-settings";
import EmailTest from "@/pages/email-test";
import SqlAdmin from "@/pages/sql-admin";
import UserProfile from "@/pages/user-profile";
import ExcelImport from "@/pages/admin/excel-import";
import Services from "@/pages/services";
import EnhancedServices from "@/pages/enhanced-services";
import AdminServiceManagement from "@/pages/admin/service-management";
import TechnicianServices from "@/pages/technician/services";
import Customer from "@/pages/customer";
import Business from "@/pages/business";
import CustomerServiceCreate from "@/pages/customer/services/new";
import BusinessServiceCreate from "@/pages/business/services/new";
import AdminServiceCreate from "@/pages/admin/services/new";
import AdminSMS from "@/pages/admin/sms-settings";
import AdminUserVerification from "@/pages/admin/user-verification";
import AdminWebsiteSecurity from "@/pages/admin/website-security";
import TechnicianProfile from "@/pages/technician/profile";
import TechnicianServicesList from "@/pages/technician-services";
import TechnicianServicesAdmin from "@/pages/admin/technician-services";

// Mobile-optimized components
import TechnicianServicesMobile from "@/pages/technician/services-mobile";
import CustomerServicesMobile from "@/pages/customer/services-mobile";
import BusinessServicesMobile from "@/pages/business/services-mobile";
import AdminServicesMobile from "@/pages/admin/services-mobile";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  const { user, isLoading } = useAuth();
  const isMobile = useMobile();
  const isMobileDevice = useMobileEnvironment();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthPage />
        <Toaster />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/clients" component={Clients} />
        <Route path="/appliances" component={Appliances} />
        <Route path="/users" component={Users} />
        <Route path="/email-settings" component={EmailSettings} />
        <Route path="/email-test" component={EmailTest} />
        <Route path="/sql-admin" component={SqlAdmin} />
        <Route path="/profile" component={UserProfile} />
        <Route path="/excel" component={ExcelImport} />
        <Route path="/services" component={Services} />
        <Route path="/enhanced-services" component={EnhancedServices} />
        <Route path="/admin/services" component={isMobile || isMobileDevice ? AdminServicesMobile : Services} />
        <Route path="/admin/service-management" component={AdminServiceManagement} />
        <Route path="/admin/sms" component={AdminSMS} />
        <Route path="/admin/user-verification" component={AdminUserVerification} />
        <Route path="/admin/website-security" component={AdminWebsiteSecurity} />
        <Route path="/tech" component={isMobile || isMobileDevice ? TechnicianServicesMobile : TechnicianServices} />
        <Route path="/tech/profile" component={TechnicianProfile} />
        <Route path="/technician-services" component={TechnicianServicesList} />
        <Route path="/admin/technician-services" component={TechnicianServicesAdmin} />
        <Route path="/customer" component={isMobile || isMobileDevice ? CustomerServicesMobile : Customer} />
        <Route path="/customer/new-service" component={CustomerServiceCreate} />
        <Route path="/business" component={isMobile || isMobileDevice ? BusinessServicesMobile : Business} />
        <Route path="/business/new-service" component={BusinessServiceCreate} />
        <Route path="/services/new" component={AdminServiceCreate} />
      </Switch>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;