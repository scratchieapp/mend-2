import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from './useUserContext';

interface IncidentData {
  incident_id: number;
  incident_number: string;
  date_of_injury: string;
  time_of_injury: string | null;
  injury_type: string;
  classification: string;
  incident_status: string;
  injury_description: string;
  fatality: boolean;
  returned_to_work: boolean;
  total_days_lost: number;
  created_at: string;
  worker_id: number | null;
  worker_name: string;
  worker_occupation: string;
  employer_id: number;
  employer_name: string;
  site_id: number | null;
  site_name: string;
  document_count: number;
}

interface UseIncidentsOptions {
  pageSize?: number;
  page?: number;
  employerId?: number | null;
  workerId?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  enabled?: boolean;
}

interface IncidentsResponse {
  incidents: IncidentData[];
  totalCount: number;
  pageSize: number;
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isFetching: boolean;
  refetch: () => void;
}

/**
 * Optimized hook that fetches both incidents and count in a single query
 * This reduces network round trips and improves dashboard load time
 */
export function useIncidentsDashboardOptimized(options: UseIncidentsOptions = {}): IncidentsResponse {
  const queryClient = useQueryClient();
  const { roleId, employerId: userEmployerId } = useUserContext();
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const {
    pageSize = 25,
    page = 1,
    employerId: filterEmployerId,
    workerId,
    startDate,
    endDate,
    enabled = true
  } = options;

  // Calculate page offset
  const pageOffset = (page - 1) * pageSize;

  // Create stable query key
  const queryKey = useMemo(() => [
    'dashboard-incidents',
    {
      roleId,
      userEmployerId,
      filterEmployerId,
      pageSize,
      pageOffset,
      workerId,
      startDate,
      endDate
    }
  ], [roleId, userEmployerId, filterEmployerId, pageSize, pageOffset, workerId, startDate, endDate]);

  // Main query using the combined function
  const query = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Create new abort controller
      abortControllerRef.current = new AbortController();
      
      // Don't fetch if no role
      if (roleId === null) {
        return {
          incidents: [],
          totalCount: 0,
          pageSize,
          pageOffset
        };
      }

      try {
        // Single RPC call that returns both data and count
        const { data, error } = await supabase.rpc('get_dashboard_data', {
          page_size: pageSize,
          page_offset: pageOffset,
          filter_employer_id: filterEmployerId,
          filter_worker_id: workerId,
          filter_start_date: startDate,
          filter_end_date: endDate,
          user_role_id: roleId,
          user_employer_id: userEmployerId
        }, { signal });

        if (error) throw error;
        if (!data) throw new Error('No data returned');

        // Parse the JSON response
        return {
          incidents: data.incidents || [],
          totalCount: data.totalCount || 0,
          pageSize: data.pageSize || pageSize,
          pageOffset: data.pageOffset || pageOffset
        };
      } catch (error: any) {
        // Don't throw on abort
        if (error.name === 'AbortError') {
          return {
            incidents: [],
            totalCount: 0,
            pageSize,
            pageOffset
          };
        }
        throw error;
      }
    },
    enabled: enabled && roleId !== null,
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on tab focus
    refetchOnReconnect: true, // Refetch on reconnect
    retry: 1, // Only retry once on failure
    retryDelay: 1000,
  });

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Calculate pagination data
  const totalCount = query.data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    incidents: query.data?.incidents || [],
    totalCount,
    pageSize,
    currentPage: page,
    totalPages,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isFetching: query.isFetching,
    refetch: query.refetch
  };
}

/**
 * Drop-in replacement for useIncidentsUltraOptimized that uses the new optimized approach
 */
export function useIncidentsUltraOptimized(options: UseIncidentsOptions = {}) {
  return useIncidentsDashboardOptimized(options);
}
