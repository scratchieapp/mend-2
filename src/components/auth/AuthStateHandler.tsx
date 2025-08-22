// src/components/auth/AuthStateHandler.tsx
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth/AuthContext';

export default function AuthStateHandler() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading) {
      const isAuthRoute = location.pathname.startsWith('/auth/');
      const isDevRoute = location.pathname.startsWith('/dev/');
      
      if (!user && !isAuthRoute && !isDevRoute) {
        // Redirect to Clerk login page which handles auth properly
        navigate('/auth/clerk-login');
      } else if (user && isAuthRoute && !location.pathname.includes('clear-session')) {
        // Only redirect away from auth pages if user is logged in (except clear-session)
        navigate('/');
      }
      // If user is at "/" and authenticated, or at "/auth/*" and not authenticated, do nothing
      // Development routes are allowed without authentication
    }
  }, [user, loading, navigate, location]);

  return null;
}