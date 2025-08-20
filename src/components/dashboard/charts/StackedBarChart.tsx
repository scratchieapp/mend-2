import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface StackedBarChartProps {
  data: any[];
  dataKeys: string[];
  colors: readonly string[];
  height?: number;
  xAxisKey?: string;
}

export const StackedBarChart = ({
  data,
  dataKeys,
  colors,
  xAxisKey = "month"
}: StackedBarChartProps) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <XAxis dataKey={xAxisKey} />
        <YAxis />
        <Tooltip />
        <Legend />
        {dataKeys.map((key, index) => (
          <Bar
            key={key}
            dataKey={key}
            name={key}
            fill={colors[index % colors.length]}
            stackId="a"
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};