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
      const isAuthRoute = location.pathname.startsWith('/auth/') || 
                         location.pathname === '/sign-in' || 
                         location.pathname === '/sign-up';
      const isDevRoute = location.pathname.startsWith('/dev/');
      
      if (!user && !isAuthRoute && !isDevRoute) {
        // Redirect to Clerk login page which handles auth properly
        navigate('/sign-in');
      } else if (user && (isAuthRoute || location.pathname === '/sign-in' || location.pathname === '/sign-up')) {
        // Redirect authenticated users away from auth pages directly to root
        // DashboardRouter will immediately redirect them to their role-specific dashboard
        navigate('/', { replace: true });
      }
      // If user is at "/" and authenticated, DashboardRouter will handle the redirect
      // Development routes are allowed without authentication
    }
  }, [user, isLoading, navigate, location]);

  return null;
}