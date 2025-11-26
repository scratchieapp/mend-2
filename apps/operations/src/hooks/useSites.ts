import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  return useQuery({
    queryKey: ['sites', employerId],
    queryFn: async () => {
      console.log('Fetching sites...', employerId ? `for employer ${employerId}` : 'all');
      
      let query = supabase
        .from('sites')
        .select(`
          *,
          employers:employer_id(employer_name)
        `)
        .order('site_name');

      if (employerId) {
        query = query.eq('employer_id', employerId);
      }

      const { data: sitesData, error: sitesError } = await query;

      if (sitesError) {
        console.error('Sites fetch error:', sitesError);
        throw sitesError;
      }

      if (!sitesData || sitesData.length === 0) {
        return [];
      }

      // Get latest status for each site
      // Optimization: We could filter this too, but for now fetch all or optimize later
      const { data: statusHistory, error: statusError } = await supabase
        .from('site_status_history')
        .select('site_id, status, month')
        .order('month', { ascending: false });
      
      if (statusError) {
        console.warn('Status history fetch warning:', statusError);
      }

      // Create a map of latest status per site
      const statusMap = new Map<number, string>();
      statusHistory?.forEach(item => {
        if (!statusMap.has(item.site_id)) {
          statusMap.set(item.site_id, item.status);
        }
      });

      // Fetch incident counts for each site
      // This N+1 query is not ideal but matches existing logic
      const sitesWithCounts = await Promise.all(
        sitesData.map(async (site) => {
          const { count: incidentCount } = await supabase
            .from('incidents')
            .select('*', { count: 'exact', head: true })
            .eq('site_id', site.site_id);

          const status = statusMap.get(site.site_id) || 'working';
          
          return {
            ...site,
            employer_name: site.employers?.employer_name || 'Unknown',
            incident_count: incidentCount || 0,
            status: status as 'working' | 'paused' | 'finished',
          };
        })
      );

      return sitesWithCounts;
    }
  });
};

