import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths } from "date-fns";
import { useEmployerContext } from "@/hooks/useEmployerContext";

interface OpenClaimsCardProps {
  selectedMonth: string;
}

export const OpenClaimsCard = ({ selectedMonth }: OpenClaimsCardProps) => {
  const { selectedEmployerId } = useEmployerContext();
  
  const { data } = useQuery({
    queryKey: ['open-claims', selectedMonth, selectedEmployerId],
    queryFn: async () => {
      // Calculate date ranges for current and previous month
      const [year, month] = selectedMonth.split('-').map(Number);
      const currentMonthStart = `${selectedMonth}-01`;
      const currentMonthEnd = `${selectedMonth}-${new Date(year, month, 0).getDate()}`;
      
      const prevMonthDate = subMonths(new Date(currentMonthStart), 1);
      const prevMonthStart = format(prevMonthDate, 'yyyy-MM-dd');
      const prevMonthEnd = format(new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0), 'yyyy-MM-dd');
      
      // Count incidents with open claims (not returned to work)
      const [currentMonthResponse, prevMonthResponse] = await Promise.all([
        supabase
          .from('incidents')
          .select('incident_id', { count: 'exact' })
          .eq('employer_id', selectedEmployerId)
          .eq('returned_to_work', false)
          .gte('date_of_injury', currentMonthStart)
          .lte('date_of_injury', currentMonthEnd),
        supabase
          .from('incidents')
          .select('incident_id', { count: 'exact' })
          .eq('employer_id', selectedEmployerId)
          .eq('returned_to_work', false)
          .gte('date_of_injury', prevMonthStart)
          .lte('date_of_injury', prevMonthEnd)
      ]);

      const currentCount = currentMonthResponse.count ?? 0;
      const prevCount = prevMonthResponse.count ?? 0;
      const difference = currentCount - prevCount;

      return {
        count: currentCount,
        difference
      };
    },
    enabled: !!selectedMonth && !!selectedEmployerId
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Open Claims</CardTitle>
        <AlertCircle className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold">{data?.count || 0}</div>
          {data && data.difference !== 0 && (
            <div className={`flex items-center ${data.difference > 0 ? 'text-amber-500' : 'text-green-500'}`}>
              {data.difference > 0 ? (
                <TrendingUp className="h-4 w-4 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 mr-1" />
              )}
              <span className="text-sm">
                {data.difference > 0 ? `+${data.difference}` : data.difference} from last month
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