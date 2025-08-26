import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@clerk/clerk-react';
import { useEffect, useState } from 'react';

interface IncidentFilters {
  employerId?: number | null;
  workerId?: number | null;
  startDate?: string | null;
  endDate?: string | null;
}

interface UserDetails {
  roleId: number;
  employerId: number | null;
}

/**
 * Custom hook for fetching incidents with RBAC
 * Uses the new get_incidents_with_details_rbac function
 */
export function useIncidentsRBAC(
  pageSize: number = 50,
  pageOffset: number = 0,
  filters: IncidentFilters = {}
) {
  const { userId } = useAuth();
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);

  // Fetch user details from Supabase
  useEffect(() => {
    async function fetchUserDetails() {
      if (!userId) return;
      
      const { data, error } = await supabase
        .from('users')
        .select('role_id, employer_id')
        .eq('clerk_user_id', userId)
        .single();
      
      if (!error && data) {
        setUserDetails({
          roleId: data.role_id,
          employerId: data.employer_id
        });
      }
    }
    
    fetchUserDetails();
  }, [userId]);

  // Fetch incidents with RBAC
  const query = useQuery({
    queryKey: ['incidents', 'rbac', pageSize, pageOffset, filters, userDetails],
    queryFn: async () => {
      if (!userDetails) {
        throw new Error('User details not loaded');
      }

      const { data, error } = await supabase
        .rpc('get_incidents_with_details_rbac', {
          page_size: pageSize,
          page_offset: pageOffset,
          filter_employer_id: filters.employerId,
          filter_worker_id: filters.workerId,
          filter_start_date: filters.startDate,
          filter_end_date: filters.endDate,
          user_role_id: userDetails.roleId,
          user_employer_id: userDetails.employerId
        });

      if (error) {
        console.error('Error fetching incidents:', error);
        throw error;
      }

      return data;
    },
    enabled: !!userDetails,
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
  });

  // Get incident count for pagination
  const countQuery = useQuery({
    queryKey: ['incidents-count', 'rbac', filters, userDetails],
    queryFn: async () => {
      if (!userDetails) {
        throw new Error('User details not loaded');
      }

      const { data, error } = await supabase
        .rpc('get_incidents_count_rbac', {
          filter_employer_id: filters.employerId,
          filter_worker_id: filters.workerId,
          filter_start_date: filters.startDate,
          filter_end_date: filters.endDate,
          user_role_id: userDetails.roleId,
          user_employer_id: userDetails.employerId
        });

      if (error) {
        console.error('Error fetching incident count:', error);
        throw error;
      }

      return data as number;
    },
    enabled: !!userDetails,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });

  return {
    incidents: query.data || [],
    totalCount: countQuery.data || 0,
    isLoading: query.isLoading || countQuery.isLoading || !userDetails,
    isError: query.isError || countQuery.isError,
    error: query.error || countQuery.error,
    refetch: () => {
      query.refetch();
      countQuery.refetch();
    },
    userRole: userDetails?.roleId,
    userEmployerId: userDetails?.employerId,
    isSuperAdmin: userDetails?.roleId === 1,
    isBuilderAdmin: userDetails?.roleId === 5
  };
}

/**
 * Hook specifically for Super Admin to view all incidents
 */
export function useSuperAdminIncidents(
  pageSize: number = 50,
  pageOffset: number = 0
) {
  return useQuery({
    queryKey: ['incidents', 'super-admin', pageSize, pageOffset],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_incidents_with_details_rbac', {
          page_size: pageSize,
          page_offset: pageOffset,
          user_role_id: 1, // Super Admin
          user_employer_id: null // Not needed for Super Admin
        });

      if (error) {
        console.error('Error fetching all incidents:', error);
        throw error;
      }

      return data;
    },
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for Builder Admin to view their employer's incidents
 */
export function useBuilderAdminIncidents(
  employerId: number,
  pageSize: number = 50,
  pageOffset: number = 0,
  filters: Omit<IncidentFilters, 'employerId'> = {}
) {
  return useQuery({
    queryKey: ['incidents', 'builder-admin', employerId, pageSize, pageOffset, filters],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_incidents_with_details_rbac', {
          page_size: pageSize,
          page_offset: pageOffset,
          filter_worker_id: filters.workerId,
          filter_start_date: filters.startDate,
          filter_end_date: filters.endDate,
          user_role_id: 5, // Builder Admin
          user_employer_id: employerId
        });

      if (error) {
        console.error('Error fetching employer incidents:', error);
        throw error;
      }

      return data;
    },
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });
}