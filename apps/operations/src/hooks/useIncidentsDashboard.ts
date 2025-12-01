/**
 * Consolidated and optimized dashboard incidents hook
 * This is the ONLY hook that should be used for dashboard incident data
 * 
 * Performance optimizations:
 * - Single RPC call for both data and count
 * - Abort controller for request cancellation
 * - Smart caching with stale-while-revalidate
 * - Optional direct RPC path for debugging
 * - Optimized React Query settings
 */

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
  updated_at: string;
  worker_id: number | null;
  worker_name: string;
  worker_occupation: string;
  employer_id: number;
  employer_name: string;
  site_id: number | null;
  site_name: string;
  department_id: number | null;
  department_name: string;
  document_count: number;
  estimated_cost: number;
  psychosocial_factors?: any;
}

interface UseIncidentsOptions {
  pageSize?: number;
  page?: number;
  employerId?: number | null;
  workerId?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  enabled?: boolean;
  archiveFilter?: 'active' | 'archived' | 'deleted' | 'all';
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
  executionTime?: number;
}

/**
 * Main dashboard incidents hook
 * Fetches paginated incident data with filtering and RBAC support
 */
export function useIncidentsDashboard(options: UseIncidentsOptions = {}): IncidentsResponse {
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
    enabled = true,
    archiveFilter = 'active'
  } = options;
  
  // Cleanup previous queries and force refetch when employer changes
  useEffect(() => {
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Invalidate queries when employer changes to force refetch
    if (filterEmployerId !== undefined) {
      queryClient.invalidateQueries({ queryKey: ['dashboard-incidents-v2'] });
    }

    return () => {
      // Cleanup on unmount - CRITICAL for memory leak prevention
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      // Remove this specific query from cache on unmount
      queryClient.removeQueries({ queryKey: ['dashboard-incidents-v2'], exact: false });
    };
  }, [filterEmployerId, queryClient]);

  // Calculate page offset
  const pageOffset = (page - 1) * pageSize;

  // Optional direct RPC for performance debugging
  const executeRpc = useCallback(async (
    functionName: string,
    params: Record<string, any>,
    signal?: AbortSignal
  ) => {
    // Force direct RPC to bypass Supabase client issues
    const useDirectRpc = true; // FORCED ON - Supabase client is slow
    const logTiming = import.meta.env.VITE_LOG_RPC_TIMING === 'true';

    // FIXED: Track timer state to avoid console.timeEnd errors
    let timerStarted = false;

    if (logTiming && import.meta.env.DEV) { // Only log in development
      try {
        console.time(`[RPC] ${functionName}`);
        timerStarted = true;
        console.info(`[RPC] ${functionName}:start`, new Date().toISOString());
      } catch (e) {
        // Ignore timer errors
      }
    }

    try {
      if (useDirectRpc) {
        // Direct fetch bypassing supabase-js client overhead
        if (import.meta.env.DEV) {
          console.log('[Direct RPC] Bypassing Supabase client for better performance');
        }
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/${functionName}`;
        const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        const fetchStart = performance.now();
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'apikey': apikey,
            'Authorization': `Bearer ${apikey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(params),
          signal
        });
        const fetchTime = performance.now() - fetchStart;
        if (import.meta.env.DEV) {
          console.log(`[Direct RPC] Network time: ${fetchTime.toFixed(0)}ms`);
        }

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`RPC ${functionName} failed: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        return { data, error: null };
      } else {
        // Standard supabase-js RPC call with timeout
        const timeoutMs = 15000; // 15 second timeout (temporary - to diagnose issue)
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`RPC timeout after ${timeoutMs}ms`)), timeoutMs)
        );

        const rpcPromise = supabase.rpc(functionName, params);

        // Race between RPC call and timeout
        return await Promise.race([rpcPromise, timeoutPromise]) as any;
      }
    } finally {
      if (logTiming && timerStarted) {
        try {
          console.info(`[RPC] ${functionName}:end`, new Date().toISOString());
          console.timeEnd(`[RPC] ${functionName}`);
        } catch (e) {
          // Ignore timer errors
        }
      }
    }
  }, []);

  // Create stable query key - ensure filterEmployerId is properly included
  const queryKey = useMemo(() => [
    'dashboard-incidents-v2',
    {
      roleId,
      userEmployerId,
      filterEmployerId, // Keep as null or number for proper cache differentiation
      pageSize,
      pageOffset,
      workerId,
      startDate,
      endDate,
      archiveFilter
    }
  ], [roleId, userEmployerId, filterEmployerId, pageSize, pageOffset, workerId, startDate, endDate, archiveFilter]);

  // Main query
  const query = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      // Don't fetch if no role
      if (roleId === null) {
        return {
          incidents: [],
          totalCount: 0,
          pageSize,
          pageOffset,
          executionTime: 0
        };
      }

      try {
        // Execute optimized RPC call with the React Query signal
        const { data, error } = await executeRpc('get_dashboard_data', {
          page_size: pageSize,
          page_offset: pageOffset,
          filter_employer_id: filterEmployerId,
          filter_worker_id: workerId,
          filter_start_date: startDate,
          filter_end_date: endDate,
          user_role_id: roleId,
          user_employer_id: userEmployerId,
          filter_archive_status: archiveFilter
        }, signal); // Use React Query's signal directly

        if (error) {
          console.error('[Dashboard] RPC error:', error);
          throw error;
        }

        if (!data) {
          throw new Error('No data returned from get_dashboard_data');
        }

        // Parse and validate response
        const incidents = Array.isArray(data.incidents) ? data.incidents : [];
        const totalCount = typeof data.totalCount === 'number' ? data.totalCount : 0;
        const executionTime = typeof data.executionTime === 'number' ? data.executionTime : undefined;

        return {
          incidents,
          totalCount,
          pageSize: data.pageSize || pageSize,
          pageOffset: data.pageOffset || pageOffset,
          executionTime
        };
      } catch (error: any) {
        // Don't throw on abort
        if (error.name === 'AbortError') {
          return {
            incidents: [],
            totalCount: 0,
            pageSize,
            pageOffset,
            executionTime: 0
          };
        }
        throw error;
      }
    },
    enabled: enabled && roleId !== null,
    staleTime: 30 * 1000, // Data is fresh for 30 seconds - aligned with global config
    gcTime: 5 * 60 * 1000, // 5 minutes - aligned with global config
    refetchOnWindowFocus: false, // Don't refetch on tab focus
    refetchOnReconnect: false, // DISABLED to prevent duplicate fetches
    retry: false, // DISABLED - was causing 37-second delays due to 3x retries
    refetchInterval: false, // DISABLED - no automatic refetching
    structuralSharing: true // Re-enabled - let global config handle this with proper memoization
  });

  // Cleanup abort controller on unmount or when dependencies change - MEMORY LEAK FIX
  useEffect(() => {
    return () => {
      // CRITICAL: Cleanup on unmount to prevent memory accumulation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      // Force garbage collection of query data
      queryClient.removeQueries({
        queryKey: ['dashboard-incidents-v2'],
        predicate: (query) => query.getObserversCount() === 0
      });
    };
  }, [queryClient]); // Only cleanup on unmount, not on filter changes

  // Calculate pagination data
  const totalCount = query.data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Log execution time in development
  useEffect(() => {
    if (query.data?.executionTime && import.meta.env.DEV) {
      console.info(`[Dashboard] Query execution time: ${query.data.executionTime}ms`);
    }
  }, [query.data?.executionTime]);

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
    refetch: query.refetch,
    executionTime: query.data?.executionTime
  };
}

// Export convenience aliases for backward compatibility
export const useIncidentsOptimized = useIncidentsDashboard;
export const useIncidentsUltraOptimized = useIncidentsDashboard;
export const useIncidentsDashboardOptimized = useIncidentsDashboard;