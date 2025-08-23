import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths } from "date-fns";

interface OpenClaimsCardProps {
  selectedMonth: string;
}

export const OpenClaimsCard = ({ selectedMonth }: OpenClaimsCardProps) => {
  const { data } = useQuery({
    queryKey: ['open-claims', selectedMonth],
    queryFn: async () => {
      const monthDate = `${selectedMonth}-01`;
      const prevMonth = format(subMonths(new Date(monthDate), 1), 'yyyy-MM-dd');
      
      const [currentMonthResponse, prevMonthResponse] = await Promise.all([
        supabase
          .from('claims')
          .select('claim_id', { count: 'exact' })
          .eq('claim_status', 'open')
          .lte('created_at', monthDate),
        supabase
          .from('claims')
          .select('claim_id', { count: 'exact' })
          .eq('claim_status', 'open')
          .lte('created_at', prevMonth)
      ]);

      if (currentMonthResponse.error) throw currentMonthResponse.error;
      if (prevMonthResponse.error) throw prevMonthResponse.error;

      const currentCount = currentMonthResponse.count ?? 0;
      const prevCount = prevMonthResponse.count ?? 0;
      const difference = currentCount - prevCount;

      return {
        count: currentCount,
        difference
      };
    },
    enabled: !!selectedMonth
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
          <div className="flex items-center text-amber-500">
            <TrendingUp className="h-4 w-4 mr-1" />
            <span className="text-sm">
              {data?.difference > 0 ? `+${data.difference}` : data?.difference} this month
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          As of {format(new Date(`${selectedMonth}-01`), 'MMMM yyyy')}
        </p>
      </CardContent>
    </Card>
  );
};