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

  // Get current employer context from database
  const { data: currentContext, isLoading: isLoadingContext } = useQuery({
    queryKey: ['employer-context', userData?.user_id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_employer_context');
      
      if (error) {
        console.error('Error fetching employer context:', error);
        return null;
      }
      
      return data as number | null;
    },
    enabled: !!userData,
  });

  // Get statistics for the current employer context
  const { data: statistics, isLoading: isLoadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['employer-statistics', currentContext],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_employer_statistics');
      
      if (error) {
        console.error('Error fetching employer statistics:', error);
        return null;
      }
      
      // The function returns an array, get the first item
      return data?.[0] as EmployerStatistics | null;
    },
    enabled: !!currentContext,
    staleTime: 30 * 1000, // Consider data stale after 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  // Mutation to set employer context
  const setContext = useMutation({
    mutationFn: async (employerId: number) => {
      const { error } = await supabase.rpc('set_employer_context', {
        employer_id: employerId
      });
      
      if (error) throw error;
      return employerId;
    },
    onSuccess: async (employerId) => {
      // Invalidate all queries that depend on employer context
      await queryClient.invalidateQueries({ queryKey: ['employer-context'] });
      await queryClient.invalidateQueries({ queryKey: ['employer-statistics'] });
      await queryClient.invalidateQueries({ queryKey: ['context-incidents'] });
      await queryClient.invalidateQueries({ queryKey: ['context-workers'] });
      await queryClient.invalidateQueries({ queryKey: ['context-sites'] });
      await queryClient.invalidateQueries({ queryKey: ['incidents'] });
      await queryClient.invalidateQueries({ queryKey: ['workers'] });
      await queryClient.invalidateQueries({ queryKey: ['sites'] });
      await queryClient.invalidateQueries({ queryKey: ['builderStats'] });
      
      // Refetch the current data
      refetchStats();
      
      toast({
        title: "Context Updated",
        description: `Viewing data for employer ID: ${employerId}`,
      });
    },
    onError: (error) => {
      console.error('Failed to set employer context:', error);
      toast({
        title: "Error",
        description: "Failed to set employer context. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Mutation to clear employer context
  const clearContext = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('clear_employer_context');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employer-context'] });
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

  // Fetch incidents with automatic RLS filtering
  const { data: contextIncidents, isLoading: isLoadingIncidents } = useQuery({
    queryKey: ['context-incidents', currentContext],
    queryFn: async () => {
      // This will automatically be filtered by RLS based on the context
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching context incidents:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!currentContext,
    staleTime: 30 * 1000, // Consider data stale after 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  // Fetch workers with automatic RLS filtering
  const { data: contextWorkers, isLoading: isLoadingWorkers } = useQuery({
    queryKey: ['context-workers', currentContext],
    queryFn: async () => {
      // This will automatically be filtered by RLS based on the context
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .order('family_name', { ascending: true });
      
      if (error) {
        console.error('Error fetching context workers:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!currentContext,
    staleTime: 30 * 1000, // Consider data stale after 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  // Fetch sites with automatic RLS filtering
  const { data: contextSites, isLoading: isLoadingSites } = useQuery({
    queryKey: ['context-sites', currentContext],
    queryFn: async () => {
      // This will automatically be filtered by RLS based on the context
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .order('site_name', { ascending: true });
      
      if (error) {
        console.error('Error fetching context sites:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!currentContext,
    staleTime: 30 * 1000, // Consider data stale after 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

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