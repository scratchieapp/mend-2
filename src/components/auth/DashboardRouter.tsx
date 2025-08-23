// src/components/auth/DashboardRouter.tsx
import { Navigate, Outlet } from "react-router-dom";
import { useClerkAuthContext } from "@/lib/clerk/ClerkAuthProvider";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Role-based dashboard mapping
const ROLE_DASHBOARDS: Record<string, string> = {
  mend_super_admin: "/admin",
  mend_account_manager: "/account-manager",
  mend_data_entry: "/dashboard",
  mend_analyst: "/dashboard",
  builder_admin: "/builder-senior",
  builder_senior: "/builder-senior",
  site_admin: "/site-admin",
  administrator: "/administrator",
  medical_professional: "/medical-dashboard",
  // Default roles
  employee: "/dashboard",
  contractor: "/dashboard",
  guest: "/dashboard",
  public_user: "/dashboard",
  manager: "/dashboard",
  supervisor: "/dashboard",
  vendor: "/dashboard",
  client: "/dashboard",
};

const DashboardRouter = () => {
  const { user, isLoading } = useClerkAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    // Only redirect if we're at the root path and have user data
    if (!isLoading && user && window.location.pathname === "/") {
      const userRole = user?.role?.role_name;
      if (userRole && ROLE_DASHBOARDS[userRole]) {
        // Redirect to role-specific dashboard
        navigate(ROLE_DASHBOARDS[userRole], { replace: true });
      } else {
        // Default to standard dashboard if role not found
        navigate("/dashboard", { replace: true });
      }
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If no user, redirect to login (should be handled by ProtectedRoute but double-check)
  if (!user) {
    return <Navigate to="/auth/clerk-login" replace />;
  }

  return <Outlet />;
};

export default DashboardRouter;