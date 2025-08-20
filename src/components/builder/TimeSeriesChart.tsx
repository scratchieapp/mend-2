import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TimeSeriesChartContent } from "./charts/TimeSeriesChartContent";
import { useTimeSeriesData } from "@/hooks/useTimeSeriesData";
import { Skeleton } from "@/components/ui/skeleton";

interface TimeSeriesChartProps {
  selectedEmployerId: number | null;
}

export const TimeSeriesChart = ({ selectedEmployerId }: TimeSeriesChartProps) => {
  const { data = [], isLoading, error } = useTimeSeriesData(selectedEmployerId);
  
  if (isLoading) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>LTI Rate Over Time (6 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>LTI Rate Over Time (6 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Error loading data
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>LTI Rate Over Time (6 Months)</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        ) : (
          <TimeSeriesChartContent data={data} />
        )}
      </CardContent>
    </Card>
  );
};