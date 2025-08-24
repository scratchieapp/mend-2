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
      
      console.log(`🔍 AuthStateHandler: Analyzing current state:`, {
        pathname: location.pathname,
        hasUser: !!user,
        userEmail: user?.email,
        userRole: user?.role?.role_name,
        isAuthRoute,
        isDevRoute,
        fullUrl: window.location.href,
        timestamp: new Date().toISOString()
      });
      
      if (!user && !isAuthRoute && !isDevRoute) {
        console.log('🔄 AuthStateHandler: No user detected, redirecting to sign-in');
        navigate('/sign-in');
      } else if (user && (isAuthRoute || location.pathname === '/sign-in' || location.pathname === '/sign-up')) {
        console.log('🔄 AuthStateHandler: Authenticated user on auth page, redirecting to root for dashboard routing');
        navigate('/', { replace: true });
      } else if (user && location.pathname === '/') {
        console.log('🔄 AuthStateHandler: Authenticated user at root - DashboardRouter should handle redirect');
      } else {
        console.log('🔄 AuthStateHandler: No action needed - user in valid state');
      }
      // If user is at "/" and authenticated, DashboardRouter will handle the redirect
      // Development routes are allowed without authentication
    }
  }, [user, isLoading, navigate, location]);

  return null;
}