import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEmployerSelection } from "@/hooks/useEmployerSelection";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useSafetySummary } from "@/hooks/useSafetySummary";
import { LoadingState } from "./safety-summary/LoadingState";
import { ErrorState } from "./safety-summary/ErrorState";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface SafetySummaryProps {
  selectedMonth: string;
}

interface Worker {
  given_name: string | null;
  family_name: string | null;
}

interface IncidentWithWorker {
  incident_id: number;
  date_of_injury: string;
  incident_summary: string | null;
  worker: Worker | null;
}

export const SafetySummary = ({ selectedMonth }: SafetySummaryProps) => {
  const { selectedEmployerId } = useEmployerSelection();
  const { data: summaryData, isLoading: isSummaryLoading, error: summaryError, refetch } = useSafetySummary(selectedEmployerId, selectedMonth);

  const { data: incidents, isLoading: isIncidentsLoading } = useQuery({
    queryKey: ['recent-incidents', selectedEmployerId, selectedMonth],
    queryFn: async () => {
      // Calculate date range for the selected month
      const startDate = `${selectedMonth}-01`;
      const [year, month] = selectedMonth.split('-').map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${selectedMonth}-${lastDay.toString().padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('incidents')
        .select(`
          incident_id,
          date_of_injury,
          incident_summary,
          worker:workers (
            given_name,
            family_name
          )
        `)
        .eq('employer_id', selectedEmployerId)
        .gte('date_of_injury', startDate)
        .lte('date_of_injury', endDate)
        .order('date_of_injury', { ascending: false })
        .limit(10)
        .returns<IncidentWithWorker[]>();

      if (error) throw error;
      return data;
    },
    enabled: !!selectedEmployerId && !!selectedMonth,
  });

  const handleRewrite = async () => {
    try {
      await supabase
        .from('generated_reports')
        .update({ 
          last_summary_generated: null
        })
        .eq('employer_id', selectedEmployerId)
        .eq('summary_month', `${selectedMonth}-01`);

      await refetch();
      
      toast({
        title: "Summary Updated",
        description: "A new safety performance summary has been generated.",
      });
    } catch (error) {
      console.error('Error rewriting summary:', error);
      toast({
        title: "Error",
        description: "Failed to generate new summary. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isSummaryLoading || isIncidentsLoading) {
    return <LoadingState />;
  }

  if (summaryError) {
    return <ErrorState />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Safety Performance Summary</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRewrite}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Rewrite
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-left">
          <p className="text-muted-foreground">{summaryData?.summary}</p>
        </CardContent>
      </Card>

      {incidents && incidents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {incidents.map((incident) => (
                <div key={incident.incident_id} className="border-b pb-4 last:border-0">
                  <p className="font-medium">
                    {incident.worker?.given_name} {incident.worker?.family_name}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {incident.incident_summary || 'Summary being generated...'}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};