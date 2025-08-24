// src/components/auth/DashboardRouter.tsx
import { Navigate, Outlet } from "react-router-dom";
import { useClerkAuthContext } from "@/lib/clerk/ClerkAuthProvider";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Role-based dashboard mapping by role_id
const ROLE_ID_DASHBOARDS: Record<number, string> = {
  1: "/admin",              // mend_super_admin
  2: "/account-manager",    // mend_account_manager  
  3: "/dashboard",          // mend_data_entry
  4: "/dashboard",          // mend_analyst
  5: "/builder-senior",     // builder_admin
  6: "/site-admin",         // site_admin
  7: "/worker-portal",      // client
  8: "/dashboard",          // vendor
  9: "/worker-portal",      // public
};

// Role-based dashboard mapping by role_name (fallback)
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
  // Worker and public roles
  public: "/worker-portal",
  // Default roles
  employee: "/dashboard",
  contractor: "/dashboard",
  guest: "/dashboard",
  public_user: "/dashboard",
  manager: "/dashboard",
  supervisor: "/dashboard",
  vendor: "/dashboard",
  client: "/worker-portal",  // Workers/clients use the worker portal
};

const DashboardRouter = () => {
  const { user, isLoading } = useClerkAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if we have user data and are at root path or just authenticated
    const currentPath = window.location.pathname;
    const isAtRoot = currentPath === "/" || currentPath === "";
    
    console.log('🔍 DashboardRouter useEffect:', {
      isLoading,
      hasUser: !!user,
      currentPath,
      isAtRoot,
      userEmail: user?.email,
      roleId: user?.role?.role_id,
      roleName: user?.role?.role_name,
      fullUrl: window.location.href
    });
    
    if (!isLoading && user && isAtRoot) {
      // First try to use role_id for mapping (most reliable)
      const roleId = user?.role?.role_id;
      console.log('🔍 DashboardRouter: Checking role_id mapping:', {
        roleId, 
        hasMapping: !!(roleId && ROLE_ID_DASHBOARDS[roleId]),
        availableRoleIds: Object.keys(ROLE_ID_DASHBOARDS),
        targetPath: roleId ? ROLE_ID_DASHBOARDS[roleId] : 'none'
      });
      
      if (roleId && ROLE_ID_DASHBOARDS[roleId]) {
        console.log(`🔄 DashboardRouter: Redirecting user with role_id ${roleId} to ${ROLE_ID_DASHBOARDS[roleId]}`);
        navigate(ROLE_ID_DASHBOARDS[roleId], { replace: true });
        return;
      }
      
      // Fallback to role_name if role_id not available
      const userRole = user?.role?.role_name;
      console.log('🔍 DashboardRouter: Checking role_name mapping:', {
        userRole,
        hasMapping: !!(userRole && ROLE_DASHBOARDS[userRole]),
        availableRoleNames: Object.keys(ROLE_DASHBOARDS),
        targetPath: userRole ? ROLE_DASHBOARDS[userRole] : 'none'
      });
      
      if (userRole && ROLE_DASHBOARDS[userRole]) {
        console.log(`🔄 DashboardRouter: Redirecting user with role_name ${userRole} to ${ROLE_DASHBOARDS[userRole]}`);
        navigate(ROLE_DASHBOARDS[userRole], { replace: true });
      } else {
        // Default to standard dashboard if role not found
        console.log(`🔄 DashboardRouter: No specific role found, redirecting to default dashboard`);
        console.log('🔍 Available role mappings:', { ROLE_ID_DASHBOARDS, ROLE_DASHBOARDS });
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
    return <Navigate to="/sign-in" replace />;
  }

  return <Outlet />;
};

export default DashboardRouter;