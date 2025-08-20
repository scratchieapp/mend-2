import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";

interface SiteComparisonProps {
  siteId: number;
  employerId: number;
  month: string;
}

export const SiteComparison = ({ siteId, employerId, month }: SiteComparisonProps) => {
  const { data: comparison, isLoading } = useQuery({
    queryKey: ['site-comparison', siteId, employerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_safety_comparison')
        .select('*')
        .eq('employer_id', employerId);

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div>Loading site comparison...</div>;
  }

  const currentSite = comparison?.find(site => site.site_id === siteId);
  if (!currentSite) return null;

  const totalSites = comparison?.length || 0;

  const getRankingIcon = (rank: number) => {
    if (rank === 1) return <ArrowUp className="h-4 w-4 text-green-500" />;
    if (rank === totalSites) return <ArrowDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Safety Performance Ranking</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-secondary rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">#{currentSite.lti_rank}</div>
                <div className="text-sm text-muted-foreground">LTI Ranking</div>
              </div>
              {getRankingIcon(currentSite.lti_rank)}
            </div>
          </div>

          <div className="p-4 bg-secondary rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">#{currentSite.recordable_rank}</div>
                <div className="text-sm text-muted-foreground">Recordable Incidents Ranking</div>
              </div>
              {getRankingIcon(currentSite.recordable_rank)}
            </div>
          </div>

          <div className="p-4 bg-secondary rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">#{currentSite.severity_rank}</div>
                <div className="text-sm text-muted-foreground">Severity Ranking</div>
              </div>
              {getRankingIcon(currentSite.severity_rank)}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-sm text-muted-foreground">
            Rankings are calculated across {totalSites} active sites within your organization.
            Lower numbers indicate better performance.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};