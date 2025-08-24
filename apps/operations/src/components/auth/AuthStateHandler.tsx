// src/components/auth/AuthStateHandler.tsx
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useClerkAuthContext } from '@/lib/clerk/ClerkAuthProvider';

export default function AuthStateHandler() {
  const { user, isLoading } = useClerkAuthContext();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading) {
      const isAuthRoute = location.pathname.startsWith('/auth/');
      const isDevRoute = location.pathname.startsWith('/dev/');
      
      if (!user && !isAuthRoute && !isDevRoute) {
        // Redirect to Clerk login page which handles auth properly
        navigate('/sign-in');
      } else if (user && isAuthRoute && !location.pathname.includes('clear-session')) {
        // Redirect authenticated users away from auth pages to root 
        // Let DashboardRouter handle role-based routing
        navigate('/', { replace: true });
      }
      // If user is at "/" and authenticated, let DashboardRouter handle the routing
      // Development routes are allowed without authentication
    }
  }, [user, isLoading, navigate, location]);

  return null;
}