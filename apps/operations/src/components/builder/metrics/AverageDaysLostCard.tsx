import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, TrendingDown, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmployerSelection } from "@/hooks/useEmployerSelection";

interface AverageDaysLostCardProps {
  selectedMonth?: string;
}

export const AverageDaysLostCard = ({ selectedMonth }: AverageDaysLostCardProps) => {
  const { selectedEmployerId } = useEmployerSelection();
  
  const { data } = useQuery({
    queryKey: ['average-days-lost', selectedEmployerId],
    queryFn: async () => {
      // Default to current financial year (July 1 to June 30)
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      
      // Determine financial year
      const financialYearStart = currentMonth >= 6 ? // July or later
        `${currentYear}-07-01` : 
        `${currentYear - 1}-07-01`;
      const financialYearEnd = currentMonth >= 6 ?
        `${currentYear + 1}-06-30` :
        `${currentYear}-06-30`;
      
      // Get last financial year for comparison
      const lastFYStart = currentMonth >= 6 ?
        `${currentYear - 1}-07-01` :
        `${currentYear - 2}-07-01`;
      const lastFYEnd = currentMonth >= 6 ?
        `${currentYear}-06-30` :
        `${currentYear - 1}-06-30`;
      
      const [currentFYData, lastFYData] = await Promise.all([
        supabase
          .from('incidents')
          .select('total_days_lost')
          .eq('employer_id', selectedEmployerId)
          .gte('date_of_injury', financialYearStart)
          .lte('date_of_injury', financialYearEnd)
          .not('total_days_lost', 'is', null),
        supabase
          .from('incidents')
          .select('total_days_lost')
          .eq('employer_id', selectedEmployerId)
          .gte('date_of_injury', lastFYStart)
          .lte('date_of_injury', lastFYEnd)
          .not('total_days_lost', 'is', null)
      ]);

      if (currentFYData.error) throw currentFYData.error;
      if (lastFYData.error) throw lastFYData.error;

      const currentAvg = currentFYData.data?.length 
        ? currentFYData.data.reduce((acc, curr) => acc + (curr.total_days_lost || 0), 0) / currentFYData.data.length 
        : 0;
      
      const lastAvg = lastFYData.data?.length 
        ? lastFYData.data.reduce((acc, curr) => acc + (curr.total_days_lost || 0), 0) / lastFYData.data.length 
        : 0;

      return {
        average: currentAvg,
        difference: currentAvg - lastAvg,
        fyStart: financialYearStart,
        fyEnd: financialYearEnd
      };
    },
    enabled: !!selectedEmployerId
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Average Days Lost</CardTitle>
        <AlertCircle className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold">{data?.average.toFixed(1) || '0.0'}</div>
          {data && data.difference !== 0 && (
            <div className={`flex items-center ${data.difference > 0 ? 'text-red-500' : 'text-green-500'}`}>
              {data.difference > 0 ? (
                <TrendingUp className="h-4 w-4 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 mr-1" />
              )}
              <span className="text-sm">
                {data.difference > 0 ? '+' : ''}{data.difference.toFixed(1)} days
              </span>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          FY {data?.fyStart ? new Date(data.fyStart).getFullYear() : new Date().getFullYear()} 
          {' '}(Jul 1 - Jun 30)
        </p>
      </CardContent>
    </Card>
  );
};