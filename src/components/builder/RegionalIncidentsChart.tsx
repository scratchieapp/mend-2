import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface RegionalIncidentsChartProps {
  selectedEmployerId: number | null;
}

interface IncidentData {
  state: string;
  incidents: number;
}

interface IncidentRecord {
  employers?: {
    employer_state: string | null;
  } | null;
}

export const RegionalIncidentsChart = ({ selectedEmployerId }: RegionalIncidentsChartProps) => {
  const { data: incidents = [] } = useQuery({
    queryKey: ['regional-incidents', selectedEmployerId],
    queryFn: async () => {
      let query = supabase
        .from('incidents')
        .select(`
          *,
          employers (
            employer_state
          )
        `);
      
      if (selectedEmployerId) {
        query = query.eq('employer_id', selectedEmployerId);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      // Group incidents by state with type safety
      const groupedByState = (data as IncidentRecord[]).reduce<Record<string, number>>((acc, incident) => {
        const state = incident.employers?.employer_state || 'Unknown';
        acc[state] = (acc[state] || 0) + 1;
        return acc;
      }, {});

      // Convert to array and sort with proper typing
      const result: IncidentData[] = Object.entries(groupedByState)
        .map(([state, count]): IncidentData => ({
          state,
          incidents: count,
        }))
        .sort((a, b) => b.incidents - a.incidents);

      return result;
    },
  });

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Incidents by Region</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={incidents}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="state" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="incidents" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};