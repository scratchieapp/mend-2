// src/components/auth/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuthContext, USE_MOCK_AUTH } from '@/lib/auth/authConfig';

interface ProtectedRouteProps {
  children?: ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuthContext();
  
  // When using mock auth, we don't need to check Clerk state
  // The mock auth provider handles all authentication state

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Authentication check - adjusted for mock auth
  if (!isAuthenticated || !user) {
    return <Navigate to="/sign-in" replace />;
  }

  // Check role-based access if roles are specified
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user?.role?.role_name;
    if (!userRole || !allowedRoles.includes(userRole)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Support both children and Outlet pattern for nested routes
  return children ? <>{children}</> : <Outlet />;
}