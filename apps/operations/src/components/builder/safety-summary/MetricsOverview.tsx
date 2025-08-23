import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface MetricsOverviewProps {
  siteId: number;
  month: Date;
}

export function MetricsOverview({ siteId, month }: MetricsOverviewProps) {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['site-metrics', siteId, month],
    queryFn: async () => {
      const startOfMonth = format(month, 'yyyy-MM-01');
      const { data, error } = await supabase
        .from('rolling_safety_metrics')
        .select('*')
        .eq('site_id', siteId)
        .eq('month', startOfMonth)
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[125px] w-full" />
        <Skeleton className="h-[125px] w-full" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Safety Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Rolling LTI Count:</dt>
              <dd className="font-medium">{metrics?.rolling_lti_count || 0}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Rolling LTIFR:</dt>
              <dd className="font-medium">{metrics?.rolling_ltifr?.toFixed(2) || 0}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Rolling TRIFR:</dt>
              <dd className="font-medium">{metrics?.rolling_trifr?.toFixed(2) || 0}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hours & Impact</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Rolling Hours:</dt>
              <dd className="font-medium">{metrics?.rolling_hours?.toLocaleString() || 0}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Days Lost:</dt>
              <dd className="font-medium">{metrics?.rolling_days_lost || 0}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Recordable Incidents:</dt>
              <dd className="font-medium">{metrics?.rolling_recordable_count || 0}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}