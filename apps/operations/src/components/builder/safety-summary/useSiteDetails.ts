import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subMonths, startOfMonth, endOfMonth } from "date-fns";

interface SiteDetails {
  siteName: string;
  city: string;
  state: string;
  projectType: string;
  employerId: number;
  incidentCount: number;
  totalHours: number;
  employerHours: number;
  subcontractorHours: number;
  ltiRate: number;
  previousMonthLTIRate: number;
  currentStatus: string;
  incidentTypes: { type: string; count: number }[];
  siteRanking: {
    ltiRank: number;
    totalSites: number;
  };
  significantChange?: {
    type: 'default' | 'warning' | 'destructive';
    message: string;
  };
}

export const useSiteDetails = (siteId: number, month: string) => {
  return useQuery({
    queryKey: ['site-safety', siteId, month],
    queryFn: async (): Promise<SiteDetails> => {
      const monthStart = startOfMonth(new Date(month));
      const monthEnd = endOfMonth(new Date(month));

      const [siteResponse, statusResponse, incidentTypesResponse, previousMonthResponse, rankingResponse] = await Promise.all([
        supabase
          .from('sites')
          .select(`
            site_name,
            city,
            state,
            project_type,
            employer_id,
            incidents(count),
            hours_worked(
              employer_hours,
              subcontractor_hours,
              month
            )
          `)
          .eq('site_id', siteId)
          .maybeSingle(),
        
        supabase
          .from('site_status_history')
          .select('status')
          .eq('site_id', siteId)
          .eq('month', month)
          .maybeSingle(),

        supabase
          .from('incident_types_summary')
          .select('injury_type, count')
          .eq('site_id', siteId)
          .eq('month', monthStart.toISOString()),

        supabase
          .from('incidents')
          .select('*', { count: 'exact', head: true })
          .eq('site_id', siteId)
          .eq('classification', 'LTI')
          .gte('date_of_injury', startOfMonth(subMonths(new Date(month), 1)).toISOString())
          .lt('date_of_injury', monthStart.toISOString()),

        supabase
          .from('site_safety_comparison')
          .select('*')
          .eq('site_id', siteId)
          .single()
      ]);

      if (siteResponse.error) throw siteResponse.error;
      if (!siteResponse.data) throw new Error('Site not found');

      const currentMonthHours = siteResponse.data.hours_worked?.find(h => 
        new Date(h.month).getMonth() === new Date(month).getMonth() &&
        new Date(h.month).getFullYear() === new Date(month).getFullYear()
      );

      const totalHours = currentMonthHours ? 
        (currentMonthHours.employer_hours + currentMonthHours.subcontractor_hours) : 0;

      const incidentCount = incidentTypesResponse.data?.reduce((sum, item) => sum + parseInt(item.count.toString()), 0) || 0;
      
      const ltiRate = totalHours > 0 ? (incidentCount / totalHours) * 1000000 : 0;
      const previousMonthIncidents = previousMonthResponse.count || 0;
      
      const previousMonthHours = siteResponse.data.hours_worked?.find(h => 
        new Date(h.month).getMonth() === new Date(subMonths(new Date(month), 1)).getMonth() &&
        new Date(h.month).getFullYear() === new Date(subMonths(new Date(month), 1)).getFullYear()
      );
      
      const previousMonthTotalHours = previousMonthHours ? 
        (previousMonthHours.employer_hours + previousMonthHours.subcontractor_hours) : 0;
      
      const previousMonthLTIRate = previousMonthTotalHours > 0 ? 
        (previousMonthIncidents / previousMonthTotalHours) * 1000000 : 0;

      // Calculate significant change
      let significantChange;
      const rateChange = ltiRate - previousMonthLTIRate;
      if (Math.abs(rateChange) > 2) {
        significantChange = {
          type: rateChange > 0 ? 'destructive' : 'default',
          message: rateChange > 0 
            ? `LTI rate has increased significantly by ${rateChange.toFixed(2)}`
            : `LTI rate has improved by ${Math.abs(rateChange).toFixed(2)}`
        };
      }

      const transformedIncidentTypes = incidentTypesResponse.data?.map(item => ({
        type: item.injury_type,
        count: parseInt(item.count.toString())
      })) || [];

      return {
        siteName: siteResponse.data.site_name,
        city: siteResponse.data.city,
        state: siteResponse.data.state,
        projectType: siteResponse.data.project_type,
        employerId: siteResponse.data.employer_id,
        incidentCount,
        totalHours,
        employerHours: currentMonthHours?.employer_hours || 0,
        subcontractorHours: currentMonthHours?.subcontractor_hours || 0,
        ltiRate,
        previousMonthLTIRate,
        currentStatus: statusResponse.data?.status || 'working',
        incidentTypes: transformedIncidentTypes,
        siteRanking: {
          ltiRank: rankingResponse.data?.lti_rank || 1,
          totalSites: rankingResponse.data?.total_sites || 1
        },
        significantChange
      };
    }
  });
};