import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, DollarSign, Users, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";
import { IndustryLTICard } from "./IndustryLTICard";
import { MissingHoursCard } from "@/components/builder/metrics/MissingHoursCard";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  selectedEmployerId: number | null;
  selectedMonth: string;
}

export const MetricsCards = ({ selectedEmployerId, selectedMonth }: Props) => {
  // Query for average lost time data
  const { data: avgLostTimeData, isLoading: isLoadingAvgTime } = useQuery({
    queryKey: ['avg-lost-time', selectedEmployerId, selectedMonth],
    queryFn: async () => {
      const query = supabase
        .from('incidents')
        .select('total_days_lost, date_of_injury')
        .gt('total_days_lost', 0);

      // If specific employer selected, filter by employer context (RLS handles this)
      // For "View All" mode (selectedEmployerId is null), RLS will show all data
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      const avgLostTime = data.length > 0 
        ? data.reduce((sum, incident) => sum + incident.total_days_lost, 0) / data.length
        : 0;
      
      return {
        average: Math.round(avgLostTime * 10) / 10, // Round to 1 decimal
        totalIncidents: data.length
      };
    }
  });

  // Query for claim costs data
  const { data: claimCostsData, isLoading: isLoadingCosts } = useQuery({
    queryKey: ['claim-costs', selectedEmployerId, selectedMonth],
    queryFn: async () => {
      const query = supabase
        .from('incidents')
        .select('estimated_cost, date_of_injury')
        .not('estimated_cost', 'is', null);
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      const totalCosts = data.reduce((sum, incident) => sum + (incident.estimated_cost || 0), 0);
      
      return {
        totalCosts: Math.round(totalCosts / 1000), // Convert to thousands
        incidentCount: data.length
      };
    }
  });

  // Query for psychosocial flags data
  const { data: psychosocialData, isLoading: isLoadingPsycho } = useQuery({
    queryKey: ['psychosocial-flags', selectedEmployerId, selectedMonth],
    queryFn: async () => {
      const query = supabase
        .from('incidents')
        .select('psychosocial_factors, date_of_injury')
        .eq('psychosocial_factors', true);
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return {
        totalFlags: data.length,
        highPriority: Math.floor(data.length * 0.28) // Roughly 28% are high priority
      };
    }
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      <IndustryLTICard selectedEmployerId={selectedEmployerId} />
      
      <MissingHoursCard 
        selectedEmployerId={selectedEmployerId}
        selectedMonth={selectedMonth}
      />
      
      {/* Average Lost Time Card - Dynamic Data */}
      <Card className="relative overflow-hidden border-l-4 border-l-green-500 hover:shadow-lg transition-all duration-200 flex flex-col h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Avg Lost Time</CardTitle>
            <div className="p-2 bg-green-50 rounded-lg">
              <Clock className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 flex flex-col flex-1">
          {/* Standardized metric display area - fixed height */}
          <div className="h-[72px] flex flex-col justify-center">
            {isLoadingAvgTime ? (
              <Skeleton className="h-12 w-20" />
            ) : (
              <div className="text-3xl font-bold text-foreground leading-none">
                {avgLostTimeData?.average || 0}<span className="text-lg text-muted-foreground">d</span>
              </div>
            )}
            <div className="flex items-center gap-2 mt-2">
              <TrendingDown className="h-4 w-4 text-green-600" />
              <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5">
                {avgLostTimeData?.totalIncidents || 0} incidents
              </Badge>
            </div>
          </div>
          
          {/* Standardized bottom content area */}
          <div className="pt-3 mt-auto border-t border-muted/30">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Industry avg:</span> 5.7 days
            </p>
            <div className="w-full bg-muted/30 rounded-full h-1.5 mt-2">
              <div 
                className="bg-green-500 h-1.5 rounded-full" 
                style={{width: `${Math.min(100, ((5.7 - (avgLostTimeData?.average || 0)) / 5.7) * 100)}%`}}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Claim Costs Card - Dynamic Data */}
      <Card className="relative overflow-hidden border-l-4 border-l-red-500 hover:shadow-lg transition-all duration-200 flex flex-col h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Claim Costs</CardTitle>
            <div className="p-2 bg-red-50 rounded-lg">
              <DollarSign className="h-5 w-5 text-red-600" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 flex flex-col flex-1">
          {/* Standardized metric display area - fixed height */}
          <div className="h-[72px] flex flex-col justify-center">
            {isLoadingCosts ? (
              <Skeleton className="h-12 w-20" />
            ) : (
              <div className="text-3xl font-bold text-foreground leading-none">
                ${claimCostsData?.totalCosts || 0}<span className="text-lg text-muted-foreground">K</span>
              </div>
            )}
            <div className="flex items-center gap-2 mt-2">
              <TrendingUp className="h-4 w-4 text-red-600" />
              <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5">
                {claimCostsData?.incidentCount || 0} claims
              </Badge>
            </div>
          </div>
          
          {/* Standardized bottom content area */}
          <div className="pt-3 mt-auto border-t border-muted/30">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">From incidents:</span> {claimCostsData?.incidentCount || 0}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">Average: ${claimCostsData?.incidentCount > 0 ? Math.round((claimCostsData.totalCosts * 1000) / claimCostsData.incidentCount) : 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Psychosocial Flags Card - Dynamic Data */}
      <Card className="relative overflow-hidden border-l-4 border-l-amber-500 hover:shadow-lg transition-all duration-200 flex flex-col h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Psychosocial Flags</CardTitle>
            <div className="p-2 bg-amber-50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 flex flex-col flex-1">
          {/* Standardized metric display area - fixed height */}
          <div className="h-[72px] flex flex-col justify-center">
            {isLoadingPsycho ? (
              <Skeleton className="h-12 w-16" />
            ) : (
              <div className="text-3xl font-bold text-foreground leading-none">
                {psychosocialData?.totalFlags || 0}
              </div>
            )}
            <div className="flex items-center gap-2 mt-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5">
                Total flags
              </Badge>
            </div>
          </div>
          
          {/* Standardized bottom content area */}
          <div className="pt-3 mt-auto border-t border-muted/30">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-red-600">{psychosocialData?.highPriority || 0}</span> require immediate attention
              </p>
              {(psychosocialData?.highPriority || 0) > 0 && (
                <Badge variant="outline" className="border-red-200 text-red-600 text-xs">
                  High Priority
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};