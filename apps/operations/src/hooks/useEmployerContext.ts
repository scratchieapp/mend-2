import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { toast } from "@/hooks/use-toast";

interface EmployerStatistics {
  incident_count: number;
  worker_count: number;
  site_count: number;
  active_lti_count: number;
  selected_employer_id: number;
  selected_employer_name: string;
  avg_days_lost?: number;
  total_days_lost?: number;
  incidents_this_month?: number;
  incidents_last_month?: number;
  open_incidents?: number;
  closed_incidents?: number;
}

/**
 * Hook for managing employer context and fetching context-aware data
 * This hook leverages the RLS policies to automatically filter data
 * based on the selected employer context
 */
export const useEmployerContext = () => {
  const { userData } = useAuth();
  const queryClient = useQueryClient();

  // Since we're using Clerk auth, we'll manage context client-side
  // Use the user's employer_id as the default context
  const { data: currentContext, isLoading: isLoadingContext } = useQuery({
    queryKey: ['employer-context', userData?.user_id],
    queryFn: async () => {
      // For now, return the user's employer_id directly
      // Super Admins can switch context, others use their assigned employer
      return userData?.employer_id || null;
    },
    enabled: !!userData,
  });

  // Get statistics for the current employer context using direct function
  const { data: statistics, isLoading: isLoadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['employer-statistics', currentContext, userData?.role_id],
    queryFn: async () => {
      if (!currentContext) return null;
      
      // Use the direct function that doesn't depend on Supabase auth
      const { data, error } = await supabase.rpc('get_employer_statistics_direct', {
        p_employer_id: currentContext,
        p_user_role: userData?.role_id
      });
      
      if (error) {
        console.error('Error fetching employer statistics:', error);
        return null;
      }
      
      // The function returns an array, get the first item
      return data?.[0] as EmployerStatistics | null;
    },
    enabled: !!currentContext && !!userData,
    staleTime: 30 * 1000, // Consider data stale after 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  // Mutation to set employer context (client-side only for now)
  const setContext = useMutation({
    mutationFn: async (employerId: number) => {
      // For Super Admins, validate they can access this employer
      if (userData?.role_id === 1) {
        // Super Admin can access any employer
        return employerId;
      } else if (userData?.employer_id && userData.employer_id !== employerId) {
        // Other users can only access their assigned employer
        throw new Error('Access denied to this employer');
      }
      return employerId;
    },
    onSuccess: async (employerId) => {
      // Update context immediately
      queryClient.setQueryData(['employer-context', userData?.user_id], employerId);
      
      // Invalidate related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['employer-statistics', employerId, userData?.role_id] }),
        queryClient.invalidateQueries({ queryKey: ['incidents'] }),
      ]);
      
      toast({
        title: "Context Updated",
        description: `Viewing data for employer ID: ${employerId}`,
      });
    },
    onError: (error) => {
      console.error('Failed to set employer context:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to set employer context",
        variant: "destructive"
      });
    }
  });

  // Mutation to clear employer context
  const clearContext = useMutation({
    mutationFn: async () => {
      // Reset to user's default employer
      return userData?.employer_id || null;
    },
    onSuccess: (defaultEmployerId) => {
      queryClient.setQueryData(['employer-context', userData?.user_id], defaultEmployerId);
      queryClient.invalidateQueries({ queryKey: ['employer-statistics'] });
      
      toast({
        title: "Context Cleared",
        description: "Employer context has been reset to default",
      });
    },
    onError: (error) => {
      console.error('Failed to clear employer context:', error);
      toast({
        title: "Error",
        description: "Failed to clear employer context",
        variant: "destructive"
      });
    }
  });

  // REMOVED: Fetch incidents with automatic RLS filtering
  // This was causing redundant fetches since IncidentsList already fetches incidents
  const contextIncidents = [];
  const isLoadingIncidents = false;

  // REMOVED: Fetch workers with automatic RLS filtering
  // This was causing redundant fetches - fetch only when needed
  const contextWorkers = [];
  const isLoadingWorkers = false;

  // REMOVED: Fetch sites with automatic RLS filtering  
  // This was causing redundant fetches - fetch only when needed
  const contextSites = [];
  const isLoadingSites = false;

  return {
    // Context management
    currentContext,
    isLoadingContext,
    setContext: setContext.mutate,
    clearContext: clearContext.mutate,
    isSettingContext: setContext.isPending,
    isClearingContext: clearContext.isPending,
    
    // Statistics
    statistics,
    isLoadingStats,
    refetchStats,
    
    // Context-filtered data
    incidents: contextIncidents,
    workers: contextWorkers,
    sites: contextSites,
    isLoadingIncidents,
    isLoadingWorkers,
    isLoadingSites,
    
    // Utility flags
    hasContext: !!currentContext,
    isSuperAdmin: userData?.role_id === 1,
  };
};