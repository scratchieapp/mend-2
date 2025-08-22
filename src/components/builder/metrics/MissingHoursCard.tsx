import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Props {
  selectedMonth: string;
  selectedEmployerId: number | null;
}

export const MissingHoursCard = ({ selectedMonth, selectedEmployerId }: Props) => {
  const navigate = useNavigate();
  
  const { data: missingSites } = useQuery({
    queryKey: ['missing-hours', selectedEmployerId, selectedMonth],
    queryFn: async () => {
      if (!selectedEmployerId) return { count: 0, sites: [] };

      // Get all active sites for the employer
      const { data: sites, error: sitesError } = await supabase
        .from('sites')
        .select('site_id, site_name')
        .eq('employer_id', selectedEmployerId);

      if (sitesError) throw sitesError;

      // Get sites that have reported hours for the month
      const { data: reportedSites, error: hoursError } = await supabase
        .from('hours_worked')
        .select('site_id')
        .eq('employer_id', selectedEmployerId)
        .eq('month', selectedMonth);

      if (hoursError) throw hoursError;

      // Find sites that haven't reported
      const reportedSiteIds = new Set(reportedSites.map(s => s.site_id));
      const missingSites = sites.filter(site => !reportedSiteIds.has(site.site_id));

      return {
        count: missingSites.length,
        sites: missingSites
      };
    },
    enabled: !!selectedEmployerId
  });

  const handleClick = () => {
    navigate('/builder/senior/hours-management');
  };

  const hasIssues = (missingSites?.count || 0) > 0;
  const borderColor = hasIssues ? 'border-l-amber-500' : 'border-l-green-500';
  const iconBgColor = hasIssues ? 'bg-amber-50' : 'bg-green-50';
  const iconColor = hasIssues ? 'text-amber-600' : 'text-green-600';

  return (
    <Card className={`relative overflow-hidden border-l-4 ${borderColor} hover:shadow-lg transition-all duration-200 cursor-pointer`} onClick={handleClick}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Missing Hours Reports</CardTitle>
          <div className={`p-2 ${iconBgColor} rounded-lg`}>
            <AlertTriangle className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-3xl font-bold text-foreground">{missingSites?.count || 0}</div>
              <div className="flex items-center gap-2 mt-1">
                <TrendingUp className={`h-4 w-4 ${iconColor}`} />
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary p-0 h-auto font-medium">
                  View Details →
                </Button>
              </div>
            </div>
          </div>
          <div className="pt-2 border-t border-muted/30">
            {missingSites?.count === 0 ? (
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  All sites have reported hours
                </p>
                <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                  Complete
                </Badge>
              </div>
            ) : (
              <div>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-amber-600">{missingSites?.count}</span> site{missingSites?.count === 1 ? '' : 's'} missing hours
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  for {new Date(selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};