import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, TrendingDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths } from "date-fns";

interface AverageDaysLostCardProps {
  selectedMonth: string;
}

export const AverageDaysLostCard = ({ selectedMonth }: AverageDaysLostCardProps) => {
  const { data } = useQuery({
    queryKey: ['average-days-lost', selectedMonth],
    queryFn: async () => {
      const monthDate = `${selectedMonth}-01`;
      const prevMonth = format(subMonths(new Date(monthDate), 1), 'yyyy-MM-dd');
      
      const [currentMonthData, prevMonthData] = await Promise.all([
        supabase
          .from('incidents')
          .select('total_days_lost')
          .gte('date_of_injury', monthDate)
          .lt('date_of_injury', format(subMonths(new Date(monthDate), -1), 'yyyy-MM-dd'))
          .not('total_days_lost', 'is', null),
        supabase
          .from('incidents')
          .select('total_days_lost')
          .gte('date_of_injury', prevMonth)
          .lt('date_of_injury', monthDate)
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
    enabled: !!selectedMonth
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
          <div className="flex items-center text-green-500">
            <TrendingDown className="h-4 w-4 mr-1" />
            <span className="text-sm">{data?.difference.toFixed(1) || '0.0'} days</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          As of {format(new Date(`${selectedMonth}-01`), 'MMMM yyyy')}
        </p>
      </CardContent>
    </Card>
  );
};