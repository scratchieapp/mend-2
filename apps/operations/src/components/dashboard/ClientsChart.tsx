import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartTooltip } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis } from "recharts";

const mockEmployerData = [
  { month: 'Jan', employers: 65 },
  { month: 'Feb', employers: 72 },
  { month: 'Mar', employers: 85 },
  { month: 'Apr', employers: 78 },
  { month: 'May', employers: 90 },
  { month: 'Jun', employers: 95 },
];

export const ClientsChart = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Employer Growth</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer className="h-[300px]" config={{}}>
          <BarChart data={mockEmployerData}>
            <XAxis dataKey="month" />
            <YAxis />
            <Bar
              dataKey="employers"
              fill="var(--sidebar-primary)"
              radius={[4, 4, 0, 0]}
            />
            <ChartTooltip />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};