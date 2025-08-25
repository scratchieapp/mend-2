import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, TrendingDown, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths } from "date-fns";
import { useEmployerSelection } from "@/hooks/useEmployerSelection";

interface AverageDaysLostCardProps {
  selectedMonth: string;
}

export const AverageDaysLostCard = ({ selectedMonth }: AverageDaysLostCardProps) => {
  const { selectedEmployerId } = useEmployerSelection();
  
  const { data } = useQuery({
    queryKey: ['average-days-lost', selectedMonth, selectedEmployerId],
    queryFn: async () => {
      const [year, month] = selectedMonth.split('-').map(Number);
      const currentMonthStart = `${selectedMonth}-01`;
      const currentMonthEnd = `${selectedMonth}-${new Date(year, month, 0).getDate()}`;
      
      const prevMonthDate = subMonths(new Date(currentMonthStart), 1);
      const prevMonthStart = format(prevMonthDate, 'yyyy-MM-dd');
      const prevMonthEnd = format(new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0), 'yyyy-MM-dd');
      
      const [currentMonthData, prevMonthData] = await Promise.all([
        supabase
          .from('incidents')
          .select('total_days_lost')
          .eq('employer_id', selectedEmployerId)
          .gte('date_of_injury', currentMonthStart)
          .lte('date_of_injury', currentMonthEnd)
          .not('total_days_lost', 'is', null),
        supabase
          .from('incidents')
          .select('total_days_lost')
          .eq('employer_id', selectedEmployerId)
          .gte('date_of_injury', prevMonthStart)
          .lte('date_of_injury', prevMonthEnd)
          .not('total_days_lost', 'is', null)
      ]);

      if (currentMonthData.error) throw currentMonthData.error;
      if (prevMonthData.error) throw prevMonthData.error;

      const currentAvg = currentMonthData.data?.length 
        ? currentMonthData.data.reduce((acc, curr) => acc + (curr.total_days_lost || 0), 0) / currentMonthData.data.length 
        : 0;
      
      const prevAvg = prevMonthData.data?.length 
        ? prevMonthData.data.reduce((acc, curr) => acc + (curr.total_days_lost || 0), 0) / prevMonthData.data.length 
        : 0;

      return {
        average: currentAvg,
        difference: currentAvg - prevAvg
      };
    },
    enabled: !!selectedMonth && !!selectedEmployerId
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
          As of {format(new Date(`${selectedMonth}-01`), 'MMMM yyyy')}
        </p>
      </CardContent>
    </Card>
  );
};