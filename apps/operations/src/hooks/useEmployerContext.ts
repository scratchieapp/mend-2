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

interface Employer {
  employer_id: number;
  employer_name: string;
}

/**
 * Master Hook for employer state management and context-aware data
 */
export const useEmployerContext = () => {
  const { userData } = useAuth();
  const queryClient = useQueryClient();

  // 1. FETCH: Get the current context (defaulting to user's employer if null)
  const { data: selectedEmployerId } = useQuery({
    queryKey: ['employer-context', userData?.user_id],
    queryFn: () => {
      const stored = localStorage.getItem("selectedEmployerId");
      // If super admin, allow null (All Companies) or stored value
      if (userData?.role_id === 1) {
        return stored === "null" ? null : (stored ? Number(stored) : null);
      }
      // For others, ALWAYS enforce their DB employer_id
      return userData?.employer_id ? Number(userData.employer_id) : null;
    },
    initialData: null
  });

  // 2. ACTION: Unified setter that handles LocalStorage AND Cache
  const setContext = useMutation({
    mutationFn: async (employerId: number | null) => {
      // Security check
      if (userData?.role_id !== 1 && userData?.employer_id !== String(employerId)) {
        throw new Error("Unauthorized context switch");
      }
      return employerId;
    },
    onSuccess: (employerId) => {
      // A. Update Local Storage
      localStorage.setItem("selectedEmployerId", employerId === null ? "null" : String(employerId));
      
      // B. Update React Query Cache (Optimistic UI)
      queryClient.setQueryData(['employer-context', userData?.user_id], employerId);
      
      // C. Nuke the specific dashboard queries to force fresh fetch
      queryClient.removeQueries({ queryKey: ['dashboard-incidents-v2'] }); 
      queryClient.invalidateQueries({ queryKey: ['employer-statistics'] });
      
      toast({ title: "Context Updated", description: "Dashboard refreshed" });
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

  // 3. DATA: Fetch list of employers (for Super Admins)
  const { data: employers = [], isLoading: isLoadingEmployers } = useQuery({
    queryKey: ['employers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employers')
        .select('employer_id, employer_name')
        .order('employer_name');

      if (error) {
        console.error('Error fetching employers:', error);
        return [];
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    enabled: userData?.role_id === 1, // Only fetch for super admins
  });

  // 4. STATS: Get statistics for the current employer context
  const { data: statistics, isLoading: isLoadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['employer-statistics', selectedEmployerId, userData?.role_id],
    queryFn: async () => {
      // If no context selected and not super admin, return null
      if (selectedEmployerId === null && userData?.role_id !== 1) return null;
      
      const { data, error } = await supabase.rpc('get_employer_statistics_direct', {
        p_employer_id: selectedEmployerId,
        p_user_role: userData?.role_id
      });
      
      if (error) {
        console.error('Error fetching employer statistics:', error);
        return null;
      }
      
      return data?.[0] as EmployerStatistics | null;
    },
    enabled: !!userData,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  return {
    // State
    selectedEmployerId,
    setContext: setContext.mutate,
    isLoading: setContext.isPending,
    
    // Data
    employers,
    isLoadingEmployers,
    statistics,
    isLoadingStats,
    refetchStats,
    
    // Helper
    isSuperAdmin: userData?.role_id === 1,
    
    // Legacy aliases for compatibility if needed
    currentContext: selectedEmployerId, 
  };
};
