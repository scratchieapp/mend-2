import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface SeverityMetricsProps {
  siteId: number;
  month: string;
}

export const SeverityMetrics = ({ siteId, month }: SeverityMetricsProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ['severity-metrics', siteId, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('severity_metrics')
        .select(`
          severity_level,
          productivity_impact_hours,
          financial_impact_estimate,
          incidents!inner (
            date_of_injury
          )
        `)
        .eq('incidents.site_id', siteId)
        .gte('incidents.date_of_injury', `${month}-01`)
        .lte('incidents.date_of_injury', format(new Date(month), 'yyyy-MM-dd'));

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div>Loading severity metrics...</div>;
  }

  const totalImpactHours = data?.reduce((sum, metric) => sum + (metric.productivity_impact_hours || 0), 0) || 0;
  const totalFinancialImpact = data?.reduce((sum, metric) => sum + (metric.financial_impact_estimate || 0), 0) || 0;

  const severityCounts = data?.reduce((acc, metric) => {
    acc[metric.severity_level] = (acc[metric.severity_level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <Card>
      <CardHeader>
        <CardTitle>Severity Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-secondary rounded-lg">
            <div className="text-2xl font-bold">{totalImpactHours.toFixed(1)}</div>
            <div className="text-sm text-muted-foreground">Productivity Hours Lost</div>
          </div>
          
          <div className="p-4 bg-secondary rounded-lg">
            <div className="text-2xl font-bold">${totalFinancialImpact.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Financial Impact</div>
          </div>
          
          <div className="p-4 bg-secondary rounded-lg">
            <div className="space-y-2">
              {Object.entries(severityCounts).map(([level, count]) => (
                <div key={level} className="flex justify-between">
                  <span className="text-sm">{level}:</span>
                  <span className="font-bold">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};