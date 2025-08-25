import { useUser } from '@clerk/clerk-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UserContext {
  roleId: number | null;
  employerId: number | null;
  isLoading: boolean;
  isMendStaff: boolean; // roles 1-3
}

export function useUserContext(): UserContext {
  const { user, isLoaded } = useUser();
  const [roleId, setRoleId] = useState<number | null>(null);
  const [employerId, setEmployerId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserContext = async () => {
      if (!isLoaded || !user?.primaryEmailAddress?.emailAddress) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('users')
          .select('role_id, employer_id')
          .eq('email', user.primaryEmailAddress.emailAddress)
          .single();

        if (!error && data) {
          setRoleId(data.role_id);
          setEmployerId(data.employer_id);
        }
      } catch (err) {
        console.error('Error fetching user context:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserContext();
  }, [user, isLoaded]);

  return {
    roleId,
    employerId,
    isLoading,
    isMendStaff: roleId !== null && roleId >= 1 && roleId <= 3
  };
}