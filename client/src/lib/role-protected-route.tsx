import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function RoleProtectedRoute({
  path,
  component: Component,
  allowedRoles
}: {
  path: string;
  component: React.ComponentType<any>;
  allowedRoles: string[];
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen flex-col">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-gray-500">Učitavanje...</p>
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Check if user has one of the allowed roles
  if (!allowedRoles.includes(user.role)) {
    // Redirect based on user role
    let redirectPath = "/";
    
    if (user.role === "technician") {
      redirectPath = "/tech";
    } else if (user.role === "customer") {
      redirectPath = "/customer";
    } else if (user.role === "admin") {
      // Ako je Com Plus login, ne preusmeravaj na /admin
      const isComplusLogin = localStorage.getItem("complus_login") === "true";
      if (!isComplusLogin) {
        redirectPath = "/admin";
      } else {
        // Ukloni flag nakon prepoznavanja
        localStorage.removeItem("complus_login");
        return <Route path={path} component={Component} />;
      }
    } else if (user.role === "business" || user.role === "partner") {
      redirectPath = "/business";
    }
    
    return (
      <Route path={path}>
        <Redirect to={redirectPath} />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}