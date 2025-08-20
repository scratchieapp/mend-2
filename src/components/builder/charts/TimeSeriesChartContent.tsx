import { memo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { MonthlyData } from "@/hooks/useTimeSeriesData";

interface TimeSeriesChartContentProps {
  data: MonthlyData[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: MonthlyData;
    value: number;
  }>;
  label?: string;
}

export const TimeSeriesChartContent = memo(({ data }: TimeSeriesChartContentProps) => {
  // Find the maximum LTI rate to set appropriate Y-axis domain
  const maxRate = Math.max(...data.map(d => d.lti_rate));
  // Set Y-axis max to nearest multiple of 5 above the max rate, or 5 if all values are low
  const yAxisMax = Math.max(5, Math.ceil(maxRate / 5) * 5);

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (!active || !payload || !payload.length || !payload[0].payload) {
      return null;
    }

    const tooltipData = payload[0].payload;
    const hours = tooltipData.total_hours || 0;

    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
        <p className="font-medium">{label}</p>
        <p className="text-sm">LTI Rate: {tooltipData.lti_rate.toFixed(2)}</p>
        <p className="text-sm">Hours: {hours.toLocaleString()}</p>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart
        data={data}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="month"
          axisLine={{ strokeWidth: 1 }}
          tickLine={{ strokeWidth: 1 }}
        />
        <YAxis 
          domain={[0, yAxisMax]}
          axisLine={{ strokeWidth: 1 }}
          tickLine={{ strokeWidth: 1 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="lti_rate"
          stroke="#2563eb"
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
});

TimeSeriesChartContent.displayName = "TimeSeriesChartContent";