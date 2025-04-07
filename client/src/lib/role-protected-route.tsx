import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function RoleProtectedRoute({
  path,
  component: Component,
  allowedRoles
}: {
  path: string;
  component: () => React.JSX.Element;
  allowedRoles: string[];
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
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
    // Redirect admin to dashboard, technician to technician dashboard
    const redirectPath = user.role === "technician" ? "/tech" : "/";
    
    return (
      <Route path={path}>
        <Redirect to={redirectPath} />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}