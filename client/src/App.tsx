import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import Services from "@/pages/services";
import Appliances from "@/pages/appliances";
import Users from "@/pages/users";
import TechnicianServices from "@/pages/technician/services";
import TechnicianProfile from "@/pages/technician/profile";
import CreateTechnicianUser from "@/pages/create-technician-user";
import MaintenanceSchedules from "@/pages/maintenance-schedules";
import { ProtectedRoute } from "./lib/protected-route";
import { RoleProtectedRoute } from "./lib/role-protected-route";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      
      {/* Admin routes */}
      <RoleProtectedRoute path="/" component={Dashboard} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/clients" component={Clients} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/services" component={Services} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/appliances" component={Appliances} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/users" component={Users} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/create-tech-user" component={CreateTechnicianUser} allowedRoles={["admin"]} />
      <RoleProtectedRoute path="/maintenance-schedules" component={MaintenanceSchedules} allowedRoles={["admin"]} />
      
      {/* Technician routes */}
      <RoleProtectedRoute path="/tech" component={TechnicianServices} allowedRoles={["technician"]} />
      <RoleProtectedRoute path="/tech/profile" component={TechnicianProfile} allowedRoles={["technician"]} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <>
      <Router />
      <Toaster />
    </>
  );
}

export default App;
