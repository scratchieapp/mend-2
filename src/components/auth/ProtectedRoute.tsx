// src/components/auth/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useClerkAuthContext } from '@/lib/clerk/ClerkAuthProvider';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useClerkAuthContext();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth/clerk-login" replace />;
  }

  if (allowedRoles && user?.role && !allowedRoles.includes(user.role.role_name)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}