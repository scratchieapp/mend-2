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
      
      if (!user && !isAuthRoute) {
        // Only redirect to login if not already on an auth page
        navigate('/auth/login');
      } else if (user && isAuthRoute) {
        // Only redirect away from auth pages if user is logged in
        navigate('/');
      }
      // If user is at "/" and authenticated, or at "/auth/*" and not authenticated, do nothing
    }
  }, [user, loading, navigate, location]);

  return null;
}