// src/components/auth/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useClerkAuthContext } from '@/lib/clerk/ClerkAuthProvider';
import { useAuth } from '@clerk/clerk-react';
import { ReactNode, useEffect } from 'react';

interface ProtectedRouteProps {
  children?: ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useClerkAuthContext();
  const { isSignedIn, isLoaded } = useAuth();

  // Double-check Clerk authentication state
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      // Force redirect if Clerk says not signed in
      window.location.href = '/auth/clerk-login';
    }
  }, [isLoaded, isSignedIn]);

  if (isLoading || !isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Strict authentication check - both Clerk and our context must agree
  if (!isSignedIn || !isAuthenticated || !user) {
    return <Navigate to="/auth/clerk-login" replace />;
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