import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useEmployerData } from "@/hooks/useEmployerData";
import { AlertCircle } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PerformanceOverviewProps {
  selectedEmployerId: number | null;
  selectedMonth: string;
}

export const PerformanceOverview = ({ selectedEmployerId, selectedMonth }: PerformanceOverviewProps) => {
  const { kpiData, isLoadingKPIs } = useEmployerData(selectedEmployerId, selectedMonth);

  if (isLoadingKPIs) {
    return (
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Safety Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div>Loading KPI data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Safety Performance Metrics</CardTitle>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">
                LTIFR: Lost Time Injury Frequency Rate (Primary Focus)<br />
                TRIFR: Total Recordable Injury Frequency Rate<br />
                MTIFR: Medical Treatment Injury Frequency Rate
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">LTIFR Target</span>
              <span className="text-muted-foreground">
                {kpiData?.lti_rate?.toFixed(2) || '0.00'} / {kpiData?.baseline_lti || 'N/A'}
              </span>
            </div>
            <Progress 
              value={kpiData?.lti_rate ? Math.min((kpiData.lti_rate / (kpiData.baseline_lti || 1)) * 100, 100) : 0} 
              className="h-2 [&>div]:bg-red-500 bg-red-100"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Primary safety indicator - Lost Time Injuries per million hours worked
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>TRIFR Progress</span>
              <span className="text-muted-foreground">92% of target</span>
            </div>
            <Progress value={92} className="h-2 [&>div]:bg-amber-500" />
            <p className="text-xs text-muted-foreground mt-1">
              Total Recordable Injury Frequency Rate
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>MTIFR Progress</span>
              <span className="text-muted-foreground">88% of target</span>
            </div>
            <Progress value={88} className="h-2 [&>div]:bg-blue-500" />
            <p className="text-xs text-muted-foreground mt-1">
              Medical Treatment Injury Frequency Rate
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};