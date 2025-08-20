import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

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

  return (
    <Card className="cursor-pointer hover:bg-secondary/50 transition-colors" onClick={handleClick}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Missing Hours Reports</CardTitle>
        <AlertTriangle className="h-4 w-4 text-amber-500" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold">{missingSites?.count || 0}</div>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
            View Details →
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {missingSites?.count === 0 
            ? "All sites have reported hours"
            : `${missingSites?.count} site${missingSites?.count === 1 ? '' : 's'} missing hours for ${new Date(selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
          }
        </p>
      </CardContent>
    </Card>
  );
};