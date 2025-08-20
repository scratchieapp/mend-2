import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle, Bandage, Calendar } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Worker {
  given_name: string | null;
  family_name: string | null;
}

interface Incident {
  incident_id: number;
  date_of_injury: string;
  injury_type: string;
  classification: string;
  injury_description: string;
  worker?: Worker;
}

interface IncidentsListProps {
  siteId: number;
  month: Date;
}

export function IncidentsList({ siteId, month }: IncidentsListProps) {
  const navigate = useNavigate();
  console.log('Rendering IncidentsList with siteId:', siteId, 'month:', month);

  const { data: incidents, isLoading, error } = useQuery({
    queryKey: ['incidents', siteId, month],
    queryFn: async () => {
      console.log('Fetching incidents for siteId:', siteId, 'month:', month);
      
      const startOfMonth = new Date(month);
      startOfMonth.setDate(1);
      const endOfMonth = new Date(month);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);

      const { data, error } = await supabase
        .from('incidents')
        .select(`
          incident_id,
          date_of_injury,
          injury_type,
          classification,
          injury_description,
          worker:workers (
            given_name,
            family_name
          )
        `)
        .eq('site_id', siteId)
        .gte('date_of_injury', startOfMonth.toISOString())
        .lte('date_of_injury', endOfMonth.toISOString());

      if (error) throw error;
      console.log('Raw incidents data:', data);

      return data as unknown as Incident[];
    }
  });

  const handleIncidentClick = async (incidentId: number) => {
    try {
      navigate(`/incidents/${incidentId}`);
    } catch (error) {
      console.error('Error handling incident click:', error);
      toast.error("Failed to open incident details");
    }
  };

  if (isLoading) {
    return <div className="p-4 text-muted-foreground">Loading incidents...</div>;
  }

  if (error) {
    return <div className="p-4 text-destructive">Error loading incidents</div>;
  }

  if (!incidents || incidents.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground bg-muted/10 rounded-lg">
        <Bandage className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
        <p>No incidents reported for this period</p>
      </div>
    );
  }

  const getClassificationColor = (classification: string) => {
    switch (classification.toUpperCase()) {
      case 'LTI':
        return 'bg-red-100 text-red-800';
      case 'MTI':
        return 'bg-yellow-100 text-yellow-800';
      case 'FAI':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {incidents.map((incident) => (
        <Card
          key={incident.incident_id}
          className="p-4 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => handleIncidentClick(incident.incident_id)}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-lg">
                  {incident.worker 
                    ? `${incident.worker.given_name || ''} ${incident.worker.family_name || ''}`
                    : 'Unknown Worker'}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getClassificationColor(incident.classification)}`}>
                  {incident.classification}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                {incident.injury_type}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              {format(new Date(incident.date_of_injury), 'dd/MM/yyyy')}
            </div>
          </div>
          {incident.injury_description && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {incident.injury_description}
            </p>
          )}
        </Card>
      ))}
    </div>
  );
}