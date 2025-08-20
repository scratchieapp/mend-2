import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface CorrectiveActionsListProps {
  siteId: number;
}

export const CorrectiveActionsList = ({ siteId }: CorrectiveActionsListProps) => {
  const { data: actions, isLoading } = useQuery({
    queryKey: ['corrective-actions', siteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('corrective_actions')
        .select(`
          *,
          incidents!inner (
            site_id,
            date_of_injury,
            injury_type
          )
        `)
        .eq('incidents.site_id', siteId)
        .order('target_completion_date', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div>Loading corrective actions...</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-500';
      case 'in progress':
        return 'bg-blue-500';
      case 'planned':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-4">
      {actions?.map((action) => (
        <Card key={action.id}>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{action.action_description}</h4>
                  <p className="text-sm text-muted-foreground">
                    Due: {format(new Date(action.target_completion_date), 'dd MMM yyyy')}
                  </p>
                </div>
                <Badge className={getStatusColor(action.status)}>
                  {action.status}
                </Badge>
              </div>
              
              <div className="flex gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <span className="ml-2">{action.action_type}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Assigned to:</span>
                  <span className="ml-2">{action.assigned_to}</span>
                </div>
              </div>

              {action.effectiveness_review && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Effectiveness Review:</span>
                  <p className="mt-1">{action.effectiveness_review}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};