import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export const PerformanceOverview = () => {
  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Annual Goals Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Incident Reduction</span>
              <span className="text-muted-foreground">75% of target</span>
            </div>
            <Progress value={75} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Return to Work Rate</span>
              <span className="text-muted-foreground">92% of target</span>
            </div>
            <Progress value={92} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Cost Containment</span>
              <span className="text-muted-foreground">68% of target</span>
            </div>
            <Progress value={68} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Safety Training Completion</span>
              <span className="text-muted-foreground">88% of target</span>
            </div>
            <Progress value={88} className="h-2" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};