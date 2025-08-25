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
  const { data: statistics, isLoading: isLoadingStats } = useQuery({
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
    onSuccess: (employerId) => {
      // Invalidate all queries that depend on employer context
      queryClient.invalidateQueries({ queryKey: ['employer-context'] });
      queryClient.invalidateQueries({ queryKey: ['employer-statistics'] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      queryClient.invalidateQueries({ queryKey: ['builderStats'] });
      
      toast({
        title: "Context Updated",
        description: `Employer context set to ID: ${employerId}`,
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
  });

  // Fetch workers with automatic RLS filtering
  const { data: contextWorkers, isLoading: isLoadingWorkers } = useQuery({
    queryKey: ['context-workers', currentContext],
    queryFn: async () => {
      // This will automatically be filtered by RLS based on the context
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .order('worker_last_name', { ascending: true });
      
      if (error) {
        console.error('Error fetching context workers:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!currentContext,
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