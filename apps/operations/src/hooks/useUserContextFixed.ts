import { useAuth } from '@/lib/auth/AuthContext';

interface UserContext {
  roleId: number | null;
  employerId: number | null;
  isLoading: boolean;
  isMendStaff: boolean; // roles 1-3
}

export function useUserContext(): UserContext {
  const { userData, isLoading } = useAuth();
  
  // Get roleId and employerId from AuthContext instead of fetching again
  const roleId = userData?.role_id || null;
  const employerId = userData?.employer_id ? parseInt(userData.employer_id) : null;
  
  return {
    roleId,
    employerId,
    isLoading,
    isMendStaff: roleId !== null && roleId >= 1 && roleId <= 3
  };
}
