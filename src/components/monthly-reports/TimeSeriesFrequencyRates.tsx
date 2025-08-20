import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, subMonths, format } from "date-fns";

interface TimeSeriesFrequencyRatesProps {
  siteId: number;
  month: string;
}

interface MonthlyRates {
  month: string;
  ltifr: number;
  trifr: number;
  mtifr: number;
}

export function TimeSeriesFrequencyRates({ siteId, month }: TimeSeriesFrequencyRatesProps) {
  const { data: ratesData = [], isLoading } = useQuery({
    queryKey: ['frequency-rates', siteId, month],
    queryFn: async () => {
      // Get last 6 months including current
      const endDate = new Date(month);
      const startDate = subMonths(endDate, 5);

      // Create monthly buckets
      const monthlyData: Record<string, MonthlyRates> = {};
      let currentDate = startDate;

      while (currentDate <= endDate) {
        const monthKey = format(currentDate, 'MMM yyyy');
        monthlyData[monthKey] = {
          month: monthKey,
          ltifr: 0,
          trifr: 0,
          mtifr: 0,
        };
        currentDate = startOfMonth(subMonths(currentDate, -1));
      }

      // Fetch incidents
      const { data: incidents, error: incidentsError } = await supabase
        .from('incidents')
        .select('date_of_injury, classification')
        .eq('site_id', siteId)
        .gte('date_of_injury', startDate.toISOString())
        .lte('date_of_injury', endDate.toISOString());

      if (incidentsError) throw incidentsError;

      // Fetch hours worked
      const { data: hours, error: hoursError } = await supabase
        .from('hours_worked')
        .select('month, employer_hours, subcontractor_hours')
        .eq('site_id', siteId)
        .gte('month', startDate.toISOString())
        .lte('month', endDate.toISOString());

      if (hoursError) throw hoursError;

      // Calculate rates for each month
      hours?.forEach((hour) => {
        const monthKey = format(new Date(hour.month), 'MMM yyyy');
        if (monthlyData[monthKey]) {
          const totalHours = Number(hour.employer_hours || 0) + Number(hour.subcontractor_hours || 0);
          
          if (totalHours > 0) {
            // Filter incidents for this month
            const monthIncidents = incidents?.filter(
              i => format(new Date(i.date_of_injury), 'MMM yyyy') === monthKey
            ) || [];

            // Count different types of incidents
            const lostTimeIncidents = monthIncidents.filter(i => 
              i.classification === 'LTI'
            ).length;

            const medicalTreatmentIncidents = monthIncidents.filter(i => 
              i.classification === 'MTI'
            ).length;

            // Total recordable incidents include both LTI and MTI
            const totalRecordableIncidents = lostTimeIncidents + medicalTreatmentIncidents;

            // Calculate rates per million hours worked
            monthlyData[monthKey].ltifr = (lostTimeIncidents / totalHours) * 1000000;
            monthlyData[monthKey].mtifr = (medicalTreatmentIncidents / totalHours) * 1000000;
            monthlyData[monthKey].trifr = (totalRecordableIncidents / totalHours) * 1000000;
          }
        }
      });

      return Object.values(monthlyData);
    },
    enabled: !!siteId && !!month,
  });

  if (isLoading) {
    return <div>Loading frequency rates...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Frequency Rates Over Time (6 Months)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={ratesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="ltifr" 
                stroke="#ef4444" 
                name="LTIFR"
                dot={{ strokeWidth: 2 }}
              />
              <Line 
                type="monotone" 
                dataKey="trifr" 
                stroke="#3b82f6" 
                name="TRIFR"
                dot={{ strokeWidth: 2 }}
              />
              <Line 
                type="monotone" 
                dataKey="mtifr" 
                stroke="#22c55e" 
                name="MTIFR"
                dot={{ strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}