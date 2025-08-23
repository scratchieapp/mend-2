import { useIncidentData } from "./charts/useIncidentData";
import { ChartContainer } from "./charts/ChartContainer";
import { StackedBarChart } from "./charts/StackedBarChart";
import { chartColors } from "./charts/ChartColors";

export const IncidentAnalytics = () => {
  const { data: chartData = { data: [], employerOrder: [] }, isError, isLoading } = useIncidentData();

  if (isLoading) {
    return <ChartContainer title="Incident Distribution by Employer">
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading chart data...</p>
      </div>
    </ChartContainer>;
  }

  if (isError) {
    return <ChartContainer title="Incident Distribution by Employer">
      <div className="flex items-center justify-center h-full">
        <p className="text-destructive">Error loading chart data</p>
      </div>
    </ChartContainer>;
  }

  // Debug logging
  console.log("Chart data:", chartData);

  // Show message if no data
  if (!chartData.data.length) {
    return <ChartContainer title="Incident Distribution by Employer">
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No incident data available for the selected period</p>
      </div>
    </ChartContainer>;
  }

  return (
    <ChartContainer title="Incident Distribution by Employer">
      <StackedBarChart
        data={chartData.data}
        dataKeys={chartData.employerOrder}
        colors={chartColors.primary}
      />
    </ChartContainer>
  );
};