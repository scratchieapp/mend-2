import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, subMonths, isFuture, isEqual, format } from "date-fns";

export const IndustryLTIChart = () => {
  const { data: chartData, isLoading, error } = useQuery({
    queryKey: ['industry-lti-rates'],
    queryFn: async () => {
      console.log('Fetching industry LTI rates...');
      
      const { data, error } = await supabase
        .from('lti_rates_mend')
        .select('month, mend_average')
        .order('month', { ascending: true });

      if (error) {
        console.error('Error fetching industry LTI rates:', error);
        throw error;
      }

      console.log('Raw data from database:', data);
      
      // Filter out future months and ensure unique months
      const currentMonth = startOfMonth(new Date());
      const lastMonth = startOfMonth(subMonths(currentMonth, 1));

      const processedData = data
        .filter(item => {
          const itemDate = startOfMonth(new Date(item.month));
          // Only include months up to last month (not current or future months)
          return !isFuture(itemDate) && !isEqual(itemDate, currentMonth);
        })
        .map(item => {
          console.log(`Processing item - Month: ${item.month}, Average: ${item.mend_average}`);
          return {
            month: new Date(item.month).toLocaleDateString('default', { month: 'short', year: 'numeric' }),
            rate: Number(item.mend_average.toFixed(1))
          };
        })
        // Remove any duplicate months that might exist in the data
        .reduce((acc, current) => {
          const exists = acc.find(item => item.month === current.month);
          if (!exists) {
            acc.push(current);
          } else {
            console.warn('Duplicate month found:', current);
          }
          return acc;
        }, []);

      console.log('Processed chart data:', processedData);
      return processedData;
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Industry LTI Rate Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            Loading chart data...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Industry LTI Rate Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-red-500">
            Error loading chart data
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mend Average LTI Rate Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <ReferenceLine y={5.6} label="Industry Average" stroke="red" strokeDasharray="3 3" />
              <Line 
                type="monotone" 
                dataKey="rate" 
                stroke="#8884d8" 
                activeDot={{ r: 8 }} 
                name="LTI Rate" 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};