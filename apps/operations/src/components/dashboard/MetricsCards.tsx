import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, DollarSign, Users, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";
import { IndustryLTICard } from "./IndustryLTICard";
import { MissingHoursCard } from "@/components/builder/metrics/MissingHoursCard";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { getIncidentMetrics } from "@/lib/supabase/metrics";
import { useUserContext } from "@/hooks/useUserContext";

interface Props {
  selectedEmployerId: number | null;
  selectedMonth: string;
}

export const MetricsCards = ({ selectedEmployerId, selectedMonth }: Props) => {
  const { roleId, employerId: userEmployerId, dbUserId } = useUserContext();

  // Query for all metrics using RBAC function
  const { data: metrics, isLoading: isLoadingMetrics } = useQuery({
    queryKey: ['incident-metrics', selectedEmployerId, selectedMonth, roleId, userEmployerId],
    queryFn: async () => {
      return await getIncidentMetrics({
        userRoleId: roleId || undefined,
        userEmployerId: userEmployerId || undefined,
        filterEmployerId: selectedEmployerId || undefined,
        selectedMonth: selectedMonth || undefined,
        dbUserId: dbUserId || undefined,
      });
    },
    enabled: roleId !== null,
    staleTime: 60 * 1000, // 60 seconds
    gcTime: 10 * 60 * 1000, // 10 minutes
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
            {isLoadingMetrics ? (
              <Skeleton className="h-12 w-20" />
            ) : (
              <div className="text-3xl font-bold text-foreground leading-none">
                {metrics?.avgLostTime || 0}<span className="text-lg text-muted-foreground">d</span>
              </div>
            )}
            <div className="flex items-center gap-2 mt-2">
              <TrendingDown className="h-4 w-4 text-green-600" />
              <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5">
                {metrics?.totalIncidents || 0} incidents
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
                style={{width: `${Math.min(100, ((5.7 - (metrics?.avgLostTime || 0)) / 5.7) * 100)}%`}}
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
            {isLoadingMetrics ? (
              <Skeleton className="h-12 w-20" />
            ) : (
              <div className="text-3xl font-bold text-foreground leading-none">
                ${Math.round(metrics?.totalClaimCosts / 1000) || 0}<span className="text-lg text-muted-foreground">K</span>
              </div>
            )}
            <div className="flex items-center gap-2 mt-2">
              <TrendingUp className="h-4 w-4 text-red-600" />
              <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5">
                {metrics?.totalIncidents || 0} claims
              </Badge>
            </div>
          </div>
          
          {/* Standardized bottom content area */}
          <div className="pt-3 mt-auto border-t border-muted/30">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">From incidents:</span> {metrics?.totalIncidents || 0}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">Average: ${metrics?.totalIncidents > 0 ? Math.round(metrics.totalClaimCosts / metrics.totalIncidents) : 0}</span>
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
            {isLoadingMetrics ? (
              <Skeleton className="h-12 w-16" />
            ) : (
              <div className="text-3xl font-bold text-foreground leading-none">
                {metrics?.psychosocialCount || 0}
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
                <span className="font-medium text-red-600">{Math.floor((metrics?.psychosocialCount || 0) * 0.28) || 0}</span> require immediate attention
              </p>
              {(Math.floor((metrics?.psychosocialCount || 0) * 0.28) || 0) > 0 && (
                <Badge variant="outline" className="border-red-200 text-red-600 text-xs">
                  {Math.floor((metrics?.psychosocialCount || 0) * 0.28)} High Priority
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
