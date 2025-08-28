import { useQuery } from '@tanstack/react-query';
import { getIncidentsWithDetails, type IncidentsListParams } from '@/lib/supabase/incidents';
import { useUserContext } from './useUserContext';

interface UseIncidentsOptions extends Omit<IncidentsListParams, 'userRoleId' | 'userEmployerId'> {
  enabled?: boolean;
  refetchInterval?: number | false;
}

/**
 * Optimized hook for fetching incidents with RBAC
 * - Uses React Query for caching
 * - Prevents unnecessary refetches
 * - Optimized query keys
 */
export function useIncidentsOptimized(options: UseIncidentsOptions = {}) {
  const { roleId, employerId: userEmployerId } = useUserContext();
  
  const {
    pageSize = 25,
    pageOffset = 0,
    employerId: filterEmployerId,
    workerId,
    startDate,
    endDate,
    enabled = true,
    refetchInterval = false
  } = options;

  return useQuery({
    queryKey: [
      'incidents-optimized',
      roleId,
      userEmployerId,
      filterEmployerId,
      pageSize,
      pageOffset,
      workerId,
      startDate,
      endDate
    ],
    queryFn: async () => {
      // Don't fetch if we don't have role information yet
      if (roleId === null) {
        return {
          incidents: [],
          totalCount: 0,
          pageSize,
          currentPage: 1,
          totalPages: 0
        };
      }

      console.time('Fetching incidents');
      const result = await getIncidentsWithDetails({
        pageSize,
        pageOffset,
        employerId: filterEmployerId,
        workerId,
        startDate,
        endDate,
        userRoleId: roleId,
        userEmployerId: userEmployerId || undefined
      });
      console.timeEnd('Fetching incidents');
      
      return result;
    },
    enabled: enabled && roleId !== null,
    staleTime: 30 * 1000, // Data is fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchInterval, // No automatic refetch by default
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
    retry: 1, // Only retry once on failure
    retryDelay: 1000 // Wait 1 second before retry
  });
}

/**
 * Hook for fetching a single page of incidents
 * Optimized for dashboard recent incidents display
 */
export function useRecentIncidents(employerId?: number) {
  return useIncidentsOptimized({
    pageSize: 10, // Only fetch 10 for recent incidents
    pageOffset: 0,
    employerId,
    refetchInterval: 60000 // Refresh every minute
  });
}