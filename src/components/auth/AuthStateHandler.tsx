// src/components/auth/AuthStateHandler.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth/AuthContext';

export default function AuthStateHandler() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/auth/login');
      } else {
        navigate('/');
      }
    }
  }, [user, loading, navigate]);

  return null;
}