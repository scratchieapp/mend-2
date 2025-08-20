import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface SummaryHistoryEntry {
  summary: string;
  generated_at: string;
}

interface GeneratedReport {
  current_summary: string | null;
  last_summary_generated: string | null;
  summary_history: SummaryHistoryEntry[] | null;
}

interface SafetySummaryResponse {
  summary: string;
  cached: boolean;
}

export const useSafetySummary = (employerId: number | null, selectedMonth: string) => {
  return useQuery({
    queryKey: ['safety-summary', employerId, selectedMonth],
    queryFn: async () => {
      if (!employerId) return null;

      try {
        const monthDate = `${selectedMonth}-01`;
        console.log('Fetching summary for month:', monthDate);

        // Update the query to ensure we get a unique record
        const { data: reportData, error: fetchError } = await supabase
          .from('generated_reports')
          .select('current_summary, last_summary_generated, summary_history')
          .eq('employer_id', employerId)
          .eq('summary_month', monthDate)
          .limit(1)
          .maybeSingle();

        if (fetchError) {
          console.error('Error fetching report:', fetchError);
          throw fetchError;
        }

        console.log('Retrieved report data:', reportData);

        if (
          reportData?.current_summary &&
          reportData?.last_summary_generated &&
          new Date(reportData.last_summary_generated).getTime() > Date.now() - 24 * 60 * 60 * 1000
        ) {
          return { summary: reportData.current_summary, cached: true };
        }

        const { data: newSummary, error } = await supabase.functions.invoke('generate-safety-summary', {
          body: { 
            employerId,
            month: monthDate
          }
        });

        if (error) {
          console.error('Error fetching safety summary:', error);
          throw error;
        }

        console.log('Generated new summary:', newSummary);

        const newHistoryEntry = {
          summary: newSummary.summary,
          generated_at: new Date().toISOString()
        };

        const existingHistory = reportData?.summary_history || [];
        const updatedHistory = [...existingHistory, newHistoryEntry];

        const { error: updateError } = await supabase
          .from('generated_reports')
          .upsert({
            employer_id: employerId,
            summary_month: monthDate,
            report_month: monthDate,
            current_summary: newSummary.summary,
            last_summary_generated: new Date().toISOString(),
            summary_history: updatedHistory
          });

        if (updateError) {
          console.error('Error storing summary:', updateError);
          throw updateError;
        }

        return { summary: newSummary.summary, cached: false };
      } catch (error) {
        console.error('Error in safety summary query:', error);
        throw error;
      }
    },
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
};