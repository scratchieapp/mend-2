import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

interface BreakdownItem {
  name: string;
  count: number;
}

interface IncidentBreakdownChartProps {
  title: string;
  data: BreakdownItem[];
  type?: 'bar' | 'pie';
  colors?: string[];
}

const DEFAULT_COLORS = [
  '#059669', // emerald-600
  '#0284c7', // sky-600
  '#7c3aed', // violet-600
  '#dc2626', // red-600
  '#d97706', // amber-600
  '#0891b2', // cyan-600
  '#4f46e5', // indigo-600
  '#db2777', // pink-600
];

export const IncidentBreakdownChart = ({
  title,
  data,
  type = 'bar',
  colors = DEFAULT_COLORS,
}: IncidentBreakdownChartProps) => {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort by count descending and take top 8
  const sortedData = [...data]
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const total = sortedData.reduce((sum, item) => sum + item.count, 0);

  if (type === 'pie') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sortedData}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => 
                    `${name.substring(0, 15)}${name.length > 15 ? '...' : ''} (${(percent * 100).toFixed(0)}%)`
                  }
                  labelLine={false}
                >
                  {sortedData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [value, 'Count']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={sortedData}
              layout="vertical"
              margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
            >
              <XAxis type="number" />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={120}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => 
                  value.length > 18 ? `${value.substring(0, 18)}...` : value
                }
              />
              <Tooltip 
                formatter={(value: number) => [value, 'Incidents']}
                labelFormatter={(label) => label}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {sortedData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Total: {total} incident{total !== 1 ? 's' : ''}
        </p>
      </CardContent>
    </Card>
  );
};

