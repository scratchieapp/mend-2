// src/components/auth/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuthContext, USE_MOCK_AUTH } from '@/lib/auth/authConfig';
import { useAuth } from '@clerk/clerk-react';

interface ProtectedRouteProps {
  children?: ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuthContext();
  
  // Always call the hook, but only use its values when not in mock mode
  const clerkAuth = useAuth();
  const isSignedIn = USE_MOCK_AUTH ? true : clerkAuth.isSignedIn;
  const isLoaded = USE_MOCK_AUTH ? true : clerkAuth.isLoaded;

  // Handle Clerk loading state
  if (!USE_MOCK_AUTH && !isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // Check Clerk authentication state
  if (!USE_MOCK_AUTH && isLoaded && !isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }

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