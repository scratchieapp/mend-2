import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '@/integrations/supabase/client';

const roleIdToDashboard: Record<number, string> = {
  1: '/admin',
  2: '/account-manager',
  3: '/data-entry',
  4: '/builder-junior',
  5: '/builder-senior',
  6: '/medical',
  7: '/insurance-provider',
  8: '/government-official',
  9: '/admin'
};

export default function DashboardRouter() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded || !user) return;

    const fetchUserRoleAndRoute = async () => {
      // Get the user's role from Supabase using their email
      const { data, error } = await supabase
        .from('users')
        .select('role_id')
        .eq('email', user.primaryEmailAddress?.emailAddress)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        navigate('/dashboard'); // fallback
        return;
      }

      if (data?.role_id) {
        const targetPath = roleIdToDashboard[data.role_id] || '/dashboard';
        
        // Only navigate if we're at root or not already at the target
        if (location.pathname === '/' || location.pathname !== targetPath) {
          navigate(targetPath);
        }
      }
    };

    fetchUserRoleAndRoute();
  }, [isLoaded, user, navigate, location.pathname]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
}