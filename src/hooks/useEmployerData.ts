import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth } from "date-fns";

export const useEmployerData = (selectedEmployerId: number | null, selectedMonth: string) => {
  const { data: kpiData, isLoading: isLoadingKPIs } = useQuery({
    queryKey: ['employer-kpis', selectedEmployerId, selectedMonth],
    queryFn: async () => {
      if (!selectedEmployerId) return null;

      try {
        
        // First set employer context
        const { error: contextError } = await supabase.rpc('set_employer_context', {
          employer_id: selectedEmployerId
        });

        if (contextError) {
          throw contextError;
        }

        // Get employer KPI data
        const { data: employerData, error: employerError } = await supabase
          .from('employers')
          .select(`
            employer_kpis (
              baseline_lti,
              baseline_comp_insurance
            )
          `)
          .eq('employer_id', selectedEmployerId)
          .maybeSingle();

        if (employerError) {
          return null;
        }

        // Get selected month's LTI rate from lti_rates table
        const monthDate = `${selectedMonth}-01`;
        
        const { data: ltiData, error: ltiError } = await supabase
          .from('lti_rates')
          .select('lti_rate, total_hours, lost_time_incidents')
          .eq('employer_id', selectedEmployerId)
          .eq('month', monthDate)
          .maybeSingle();

        if (ltiError) {
        }


        return {
          lti_rate: ltiData?.lti_rate || 0,
          total_hours: ltiData?.total_hours || 0,
          lost_time_incidents: ltiData?.lost_time_incidents || 0,
          baseline_lti: employerData?.employer_kpis?.[0]?.baseline_lti || null,
          baseline_comp_insurance: employerData?.employer_kpis?.[0]?.baseline_comp_insurance || null,
        };
      } catch (error) {
        return null;
      }
    },
    enabled: !!selectedEmployerId && !!selectedMonth,
  });

  return {
    kpiData,
    isLoadingKPIs,
  };
};