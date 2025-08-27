import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@clerk/clerk-react';

interface IncidentFilters {
  employerId?: number | null;
  workerId?: number | null;
  startDate?: string | null;
  endDate?: string | null;
}

interface OptimizedIncident {
  incident_id: number;
  date_of_injury: string;
  time_of_injury: string;
  date_reported: string;
  incident_status: string;
  estimated_cost: number;
  psychosocial_factors: any;
  employer_id: number;
  employer_name: string;
  worker_id: number;
  worker_name: string;
  site_id: number;
  site_name: string;
  created_at: string;
  updated_at: string;
}

interface IncidentMetrics {
  total_incidents: number;
  open_incidents: number;
  closed_incidents: number;
  total_cost: number;
  psychosocial_count: number;
  recent_incidents: number;
}

/**
 * Optimized hook for fetching incidents with RBAC and pagination
 * Uses the new performance-optimized database functions
 */
export function useIncidentsRBACOptimized(
  pageSize: number = 50,
  pageOffset: number = 0,
  filters: IncidentFilters = {}
) {
  const { userId } = useAuth();

  // Fetch paginated incidents using optimized function
  const incidentsQuery = useQuery({
    queryKey: ['incidents-optimized', userId, pageSize, pageOffset, filters],
    queryFn: async () => {
      if (!userId) throw new Error('User not authenticated');

      // Use the optimized function with built-in pagination
      const { data, error } = await supabase
        .rpc('get_incidents_with_details_rbac_optimized', {
          p_user_id: userId,
          p_employer_id: filters.employerId || null,
          p_limit: pageSize,
          p_offset: pageOffset
        });

      if (error) {
        console.error('Error fetching optimized incidents:', error);
        throw error;
      }

      // Apply additional filters if needed
      let filteredData = data as OptimizedIncident[];
      
      if (filters.workerId) {
        filteredData = filteredData.filter(inc => inc.worker_id === filters.workerId);
      }
      
      if (filters.startDate) {
        filteredData = filteredData.filter(inc => 
          new Date(inc.date_of_injury) >= new Date(filters.startDate!)
        );
      }
      
      if (filters.endDate) {
        filteredData = filteredData.filter(inc => 
          new Date(inc.date_of_injury) <= new Date(filters.endDate!)
        );
      }

      return filteredData;
    },
    enabled: !!userId,
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  // Fetch count using optimized function
  const countQuery = useQuery({
    queryKey: ['incidents-count-optimized', userId, filters.employerId],
    queryFn: async () => {
      if (!userId) return 0;

      const { data, error } = await supabase
        .rpc('get_incidents_count_rbac_optimized', {
          p_user_id: userId,
          p_employer_id: filters.employerId || null
        });

      if (error) {
        console.error('Error fetching incident count:', error);
        return 0;
      }

      return data || 0;
    },
    enabled: !!userId,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });

  // Fetch metrics using lightweight function
  const metricsQuery = useQuery({
    queryKey: ['incidents-metrics-optimized', userId, filters.employerId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .rpc('get_incidents_metrics_rbac', {
          p_user_id: userId,
          p_employer_id: filters.employerId || null
        });

      if (error) {
        console.error('Error fetching metrics:', error);
        return null;
      }

      return data as IncidentMetrics;
    },
    enabled: !!userId,
    staleTime: 60000, // Cache for 1 minute
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  return {
    // Incidents data
    incidents: incidentsQuery.data || [],
    isLoading: incidentsQuery.isLoading,
    error: incidentsQuery.error,
    refetch: incidentsQuery.refetch,
    
    // Count data
    totalCount: countQuery.data || 0,
    isCountLoading: countQuery.isLoading,
    
    // Metrics data
    metrics: metricsQuery.data,
    isMetricsLoading: metricsQuery.isLoading,
    
    // Pagination helpers
    hasNextPage: (countQuery.data || 0) > pageOffset + pageSize,
    hasPreviousPage: pageOffset > 0,
    totalPages: Math.ceil((countQuery.data || 0) / pageSize),
    currentPage: Math.floor(pageOffset / pageSize) + 1,
  };
}

/**
 * Hook for fetching employer statistics
 */
export function useEmployerStatistics(employerId?: number | null) {
  return useQuery({
    queryKey: ['employer-statistics', employerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_employer_statistics', {
          p_employer_id: employerId || null
        });

      if (error) {
        console.error('Error fetching employer statistics:', error);
        throw error;
      }

      return data;
    },
    enabled: true,
    staleTime: 60000, // Cache for 1 minute
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
}