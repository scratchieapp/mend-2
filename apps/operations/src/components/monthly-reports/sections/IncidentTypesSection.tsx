import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface IncidentTypesSectionProps {
  siteId: number;
  month: string;
}

export function IncidentTypesSection({ siteId, month }: IncidentTypesSectionProps) {
  const { data: incidentTypes = [], isLoading } = useQuery({
    queryKey: ['incident-types', siteId, month],
    queryFn: async () => {
      const startOfMonth = format(new Date(month), 'yyyy-MM-01');
      
      const { data, error } = await supabase
        .from('incident_types_summary')
        .select('injury_type, count')
        .eq('site_id', siteId)
        .eq('month', startOfMonth);

      if (error) throw error;
      
      return data.map(item => ({
        type: item.injury_type,
        count: Number(item.count)
      }));
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Incident Types Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {!isLoading && incidentTypes.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incidentTypes}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              {isLoading ? "Loading incident data..." : "No incident data available for this period"}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}