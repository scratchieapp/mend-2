import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CalendarDays, TrendingUp, TrendingDown } from "lucide-react";

export const PerformanceOverview = () => {
  // Calculate year progress
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const endOfYear = new Date(now.getFullYear() + 1, 0, 1);
  const yearProgress = ((now.getTime() - startOfYear.getTime()) / (endOfYear.getTime() - startOfYear.getTime())) * 100;
  const dayOfYear = Math.ceil((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  const totalDays = Math.ceil((endOfYear.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));

  // Helper function to determine if goals are on track
  const getProgressStatus = (goalProgress: number, yearProgress: number) => {
    const expectedProgress = yearProgress;
    const variance = goalProgress - expectedProgress;
    
    if (variance >= 5) return { status: 'ahead', icon: TrendingUp, color: 'text-green-600' };
    if (variance <= -10) return { status: 'behind', icon: TrendingDown, color: 'text-red-600' };
    return { status: 'on-track', icon: TrendingUp, color: 'text-blue-600' };
  };

  const goals = [
    { name: "Incident Reduction", progress: 75 },
    { name: "Return to Work Rate", progress: 92 },
    { name: "Cost Containment", progress: 68 },
    { name: "Safety Training Completion", progress: 88 }
  ];

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Annual Goals Progress
        </CardTitle>
        {/* Year Progress Indicator */}
        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Year Progress</span>
            <span className="text-sm text-muted-foreground">
              Day {dayOfYear} of {totalDays} ({Math.round(yearProgress)}% through {now.getFullYear()})
            </span>
          </div>
          <Progress value={yearProgress} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            Goals should be at ~{Math.round(yearProgress)}% completion to stay on track for annual targets
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {goals.map((goal) => {
            const status = getProgressStatus(goal.progress, yearProgress);
            const StatusIcon = status.icon;
            
            return (
              <div key={goal.name} className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-2">
                    {goal.name}
                    <StatusIcon className={`h-4 w-4 ${status.color}`} />
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{goal.progress}% of target</span>
                    <span className={`text-xs font-medium ${status.color}`}>
                      {status.status === 'ahead' && '↗ Ahead'}
                      {status.status === 'on-track' && '→ On Track'}
                      {status.status === 'behind' && '↘ Behind'}
                    </span>
                  </div>
                </div>
                <div className="relative">
                  <Progress value={goal.progress} className="h-3" />
                  {/* Expected progress line */}
                  <div 
                    className="absolute top-0 h-3 w-0.5 bg-black/30 rounded"
                    style={{ left: `${Math.min(yearProgress, 100)}%` }}
                    title={`Expected: ${Math.round(yearProgress)}%`}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Expected: {Math.round(yearProgress)}%</span>
                  <span>
                    {goal.progress > yearProgress 
                      ? `+${Math.round(goal.progress - yearProgress)}% ahead of schedule`
                      : goal.progress < yearProgress 
                        ? `${Math.round(yearProgress - goal.progress)}% behind schedule`
                        : 'Right on schedule'
                    }
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};