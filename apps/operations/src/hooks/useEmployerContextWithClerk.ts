import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { useAuth as useClerkAuth, useUser as useClerkUser } from "@clerk/clerk-react";
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
 * Hook for managing employer context with Clerk authentication
 * This hook passes Clerk user info to RPC functions for proper authentication
 */
export const useEmployerContextWithClerk = () => {
  const { userData } = useAuth();
  const { userId: clerkUserId } = useClerkAuth();
  const { user: clerkUser } = useClerkUser();
  const queryClient = useQueryClient();
  
  const clerkEmail = clerkUser?.primaryEmailAddress?.emailAddress || null;

  // Get current employer context from database with Clerk auth
  const { data: currentContext, isLoading: isLoadingContext } = useQuery({
    queryKey: ['employer-context-clerk', clerkUserId, clerkEmail],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_employer_context_with_clerk', {
        clerk_user_id: clerkUserId || null,
        clerk_email: clerkEmail
      });
      
      if (error) {
        console.error('Error fetching employer context:', error);
        return null;
      }
      
      return data as number | null;
    },
    enabled: !!clerkUserId || !!clerkEmail,
  });

  // Get statistics for the current employer context
  const { data: statistics, isLoading: isLoadingStats } = useQuery({
    queryKey: ['employer-statistics-clerk', currentContext, clerkUserId],
    queryFn: async () => {
      // For now, we'll fetch statistics manually since get_employer_statistics 
      // doesn't accept Clerk params yet
      if (!currentContext) return null;
      
      const [incidentsRes, workersRes, sitesRes] = await Promise.all([
        supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('employer_id', currentContext),
        supabase.from('workers').select('*', { count: 'exact', head: true }).eq('employer_id', currentContext),
        supabase.from('sites').select('*', { count: 'exact', head: true }).eq('employer_id', currentContext),
      ]);
      
      const employerRes = await supabase
        .from('employers')
        .select('employer_name')
        .eq('employer_id', currentContext)
        .single();
      
      return {
        incident_count: incidentsRes.count || 0,
        worker_count: workersRes.count || 0,
        site_count: sitesRes.count || 0,
        active_lti_count: 0, // Would need a more complex query
        selected_employer_id: currentContext,
        selected_employer_name: employerRes.data?.employer_name || 'Unknown'
      } as EmployerStatistics;
    },
    enabled: currentContext !== null && currentContext !== undefined,
  });

  // Mutation to set employer context with Clerk auth
  const setContext = useMutation({
    mutationFn: async (employerId: number | null) => {
      const { error } = await supabase.rpc('set_employer_context_with_clerk', {
        employer_id: employerId,
        clerk_user_id: clerkUserId || null,
        clerk_email: clerkEmail
      });
      
      if (error) throw error;
      return employerId;
    },
    onSuccess: (employerId) => {
      // Invalidate all queries that depend on employer context
      queryClient.invalidateQueries({ queryKey: ['employer-context-clerk'] });
      queryClient.invalidateQueries({ queryKey: ['employer-statistics-clerk'] });
      queryClient.invalidateQueries({ queryKey: ['incidents-clerk'] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      queryClient.invalidateQueries({ queryKey: ['builderStats'] });
      
      const message = employerId === null 
        ? "Viewing all companies" 
        : `Viewing company ID: ${employerId}`;
        
      toast({
        title: "Context Updated",
        description: message,
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
      const { error } = await supabase.rpc('clear_employer_context_with_clerk', {
        clerk_user_id: clerkUserId || null,
        clerk_email: clerkEmail
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employer-context-clerk'] });
      queryClient.invalidateQueries({ queryKey: ['employer-statistics-clerk'] });
      
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

  // Fetch incidents with Clerk auth params
  const { data: incidents, isLoading: isLoadingIncidents } = useQuery({
    queryKey: ['incidents-clerk', currentContext, clerkUserId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_incidents_with_details', {
        page_size: 50,
        page_offset: 0,
        clerk_user_id: clerkUserId || null,
        clerk_email: clerkEmail
      });
      
      if (error) {
        console.error('Error fetching incidents:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: (!!clerkUserId || !!clerkEmail),
  });

  // Fetch workers - RLS disabled so direct query works
  const { data: contextWorkers, isLoading: isLoadingWorkers } = useQuery({
    queryKey: ['context-workers', currentContext],
    queryFn: async () => {
      if (!currentContext) return [];
      
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .eq('employer_id', currentContext)
        .order('family_name', { ascending: true });
      
      if (error) {
        console.error('Error fetching context workers:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!currentContext,
  });

  // Fetch sites - RLS disabled so direct query works
  const { data: contextSites, isLoading: isLoadingSites } = useQuery({
    queryKey: ['context-sites', currentContext],
    queryFn: async () => {
      if (!currentContext) return [];
      
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .eq('employer_id', currentContext)
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
    incidents,
    workers: contextWorkers,
    sites: contextSites,
    isLoadingIncidents,
    isLoadingWorkers,
    isLoadingSites,
    
    // Utility flags
    hasContext: currentContext !== null && currentContext !== undefined,
    isSuperAdmin: userData?.role_id === 1,
    isViewingAll: userData?.role_id === 1 && currentContext === null,
  };
};