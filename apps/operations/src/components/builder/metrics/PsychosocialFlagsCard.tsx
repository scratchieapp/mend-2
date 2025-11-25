import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, AlertTriangle, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmployerContext } from "@/hooks/useEmployerContext";
import { format } from "date-fns";

interface PsychosocialFlagsCardProps {
  selectedMonth: string;
}

export const PsychosocialFlagsCard = ({ selectedMonth }: PsychosocialFlagsCardProps) => {
  const { selectedEmployerId } = useEmployerContext();
  
  const { data: psychosocialData } = useQuery({
    queryKey: ['psychosocial-flags', selectedMonth, selectedEmployerId],
    queryFn: async () => {
      if (!selectedEmployerId) return null;
      
      const [year, month] = selectedMonth.split('-').map(Number);
      const currentMonthStart = `${selectedMonth}-01`;
      const currentMonthEnd = `${selectedMonth}-${new Date(year, month, 0).getDate()}`;
      
      // Get incidents for the month
      const { data: incidents, error } = await supabase
        .from('incidents')
        .select(`
          incident_id,
          injury_description,
          case_notes,
          classification
        `)
        .eq('employer_id', selectedEmployerId)
        .gte('date_of_injury', currentMonthStart)
        .lte('date_of_injury', currentMonthEnd);
      
      if (error || !incidents) return { count: 0, riskLevel: 'low' };
      
      // Analyze incidents for psychosocial indicators
      const psychosocialKeywords = [
        'stress', 'anxiety', 'harassment', 'bullying', 'fatigue',
        'mental', 'psychological', 'depression', 'burnout', 'pressure',
        'workload', 'overtime', 'conflict', 'dispute', 'complaint'
      ];
      
      let flaggedIncidents = 0;
      incidents.forEach(incident => {
        const text = `${incident.injury_description || ''} ${incident.case_notes || ''}`.toLowerCase();
        const hasFlag = psychosocialKeywords.some(keyword => text.includes(keyword));
        if (hasFlag) flaggedIncidents++;
      });
      
      // Determine risk level
      const flagPercentage = incidents.length > 0 ? (flaggedIncidents / incidents.length) * 100 : 0;
      let riskLevel = 'low';
      if (flagPercentage > 20) riskLevel = 'high';
      else if (flagPercentage > 10) riskLevel = 'medium';
      
      return {
        count: flaggedIncidents,
        total: incidents.length,
        percentage: flagPercentage,
        riskLevel
      };
    },
    enabled: !!selectedMonth && !!selectedEmployerId
  });
  
  const getRiskColor = (level: string) => {
    switch(level) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-amber-500';
      default: return 'text-green-500';
    }
  };
  
  const getRiskBgColor = (level: string) => {
    switch(level) {
      case 'high': return 'bg-red-50';
      case 'medium': return 'bg-amber-50';
      default: return 'bg-green-50';
    }
  };
  
  return (
    <Card className={psychosocialData ? getRiskBgColor(psychosocialData.riskLevel) : ''}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Psychosocial Risk Flags</CardTitle>
        <Brain className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold">
            {psychosocialData?.count || 0}
            {psychosocialData && psychosocialData.total > 0 && (
              <span className="text-sm font-normal text-muted-foreground ml-1">
                / {psychosocialData.total}
              </span>
            )}
          </div>
          {psychosocialData && psychosocialData.count > 0 && (
            <div className={`flex items-center ${getRiskColor(psychosocialData.riskLevel)}`}>
              <AlertTriangle className="h-4 w-4 mr-1" />
              <span className="text-sm font-medium">
                {psychosocialData.riskLevel.toUpperCase()} RISK
              </span>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {psychosocialData && psychosocialData.percentage > 0 
            ? `${psychosocialData.percentage.toFixed(0)}% of incidents flagged`
            : 'No psychosocial indicators detected'
          }
        </p>
      </CardContent>
    </Card>
  );
};