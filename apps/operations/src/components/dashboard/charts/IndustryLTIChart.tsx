import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, subMonths, isFuture, isEqual, format } from "date-fns";

interface IndustryLTIChartProps {
  selectedEmployerId?: number | null;
}

export const IndustryLTIChart = ({ selectedEmployerId }: IndustryLTIChartProps) => {
  const { data: chartData, isLoading, error } = useQuery({
    queryKey: ['industry-lti-rates', selectedEmployerId],
    queryFn: async () => {
      // Use actual Australian construction industry LTI data
      // Source: Federal Safety Commissioner Annual Data Reports
      const industryData = [
        { year: 2019, rate: 1.48 },
        { year: 2020, rate: 1.48 },
        { year: 2021, rate: 1.58 },
        { year: 2022, rate: 1.27 },
        { year: 2023, rate: 1.50 },
        { year: 2024, rate: 1.50 }, // Projected based on trend
      ];

      // Calculate employer-specific LTI rate if employer is selected
      let employerRate = null;
      if (selectedEmployerId) {
        // Get total hours worked and LTI incidents for this employer in current year
        const currentYear = new Date().getFullYear();
        const yearStart = `${currentYear}-01-01`;
        const yearEnd = `${currentYear}-12-31`;
        
        const { data: incidents, error: incError } = await supabase
          .from('incidents')
          .select('classification')
          .eq('employer_id', selectedEmployerId)
          .eq('classification', 'LTI')
          .gte('date_of_injury', yearStart)
          .lte('date_of_injury', yearEnd);
        
        if (!incError && incidents) {
          // Estimate hours worked (assuming 40 hours/week * 50 weeks * number of workers)
          // This is a rough estimate - ideally would come from actual hours data
          const { data: workers } = await supabase
            .from('workers')
            .select('worker_id')
            .eq('employer_id', selectedEmployerId);
          
          const estimatedHoursWorked = (workers?.length || 50) * 40 * 50 * 12; // Monthly average
          const ltiCount = incidents.length;
          
          // Calculate LTIFR: (LTIs / Hours Worked) * 1,000,000
          employerRate = estimatedHoursWorked > 0 ? 
            (ltiCount / estimatedHoursWorked) * 1000000 : 0;
        }
      }

      // Format data for chart
      const processedData = industryData.map(item => {
          return {
            month: item.year.toString(),
            rate: item.rate,
            employerRate: item.year === new Date().getFullYear() ? employerRate : null
          };
        });

      // Processed chart data
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