import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";

export interface Site {
  site_id: number;
  site_name: string;
  street_address: string;
  city: string;
  state: string;
  post_code: string;
  employer_id: number;
  supervisor_name?: string;
  supervisor_telephone?: string;
  project_type?: string;
  created_at: string;
  updated_at: string;
  employer_name?: string;
  incident_count?: number;
  latitude?: number;
  longitude?: number;
  status?: 'working' | 'paused' | 'finished';
}

export const useSites = (employerId?: number | null) => {
  const { userData } = useAuth();
  
  return useQuery({
    queryKey: ['sites', employerId, userData?.role_id, userData?.employer_id],
    queryFn: async () => {
      console.log('Fetching sites via RBAC...', employerId ? `for employer ${employerId}` : 'all');
      
      // Use RBAC function to bypass RLS and get consistent access
      const { data: sitesData, error: sitesError } = await supabase.rpc('get_sites_rbac', {
        p_employer_id: employerId || null,
        p_user_role_id: userData?.role_id || null,
        p_user_employer_id: userData?.employer_id ? parseInt(userData.employer_id) : null
      });

      if (sitesError) {
        console.error('Sites RBAC fetch error:', sitesError);
        throw sitesError;
      }

      if (!sitesData || sitesData.length === 0) {
        return [];
      }

      // Map the RPC result to the expected format
      return sitesData.map(site => ({
        ...site,
        status: (site.status || 'working') as 'working' | 'paused' | 'finished',
      }));
    },
    enabled: !!(userData?.role_id)
  });
};

