import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, DollarSign, Users } from "lucide-react";
import { IndustryLTICard } from "./IndustryLTICard";
import { MissingHoursCard } from "@/components/builder/metrics/MissingHoursCard";

interface Props {
  selectedEmployerId: number | null;
  selectedMonth: string;
}

export const MetricsCards = ({ selectedEmployerId, selectedMonth }: Props) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      <IndustryLTICard />
      
      <MissingHoursCard 
        selectedEmployerId={selectedEmployerId}
        selectedMonth={selectedMonth}
      />
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Avg Lost Time</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">4.2d</div>
            <div className="flex items-center text-green-500">
              <span className="text-sm">-8% from last month</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Industry avg: 5.7 days
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Claim Costs</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">$142K</div>
            <div className="flex items-center text-red-500">
              <span className="text-sm">+15% from last month</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            YTD: $1.2M
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Psychosocial Flags</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">18</div>
            <div className="flex items-center text-amber-500">
              <span className="text-sm">+2 from last month</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            5 require immediate attention
          </p>
        </CardContent>
      </Card>
    </div>
  );
};