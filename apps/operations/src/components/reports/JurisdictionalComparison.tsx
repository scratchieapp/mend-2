import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { INDUSTRY_BENCHMARKS } from "@/types/reports";

interface StateData {
  state: string;
  count: number;
  ltifr: number;
  hours?: number;
}

interface JurisdictionalComparisonProps {
  data: StateData[];
  totalHours?: number;
}

const STATE_NAMES: Record<string, string> = {
  NSW: 'New South Wales',
  VIC: 'Victoria',
  QLD: 'Queensland',
  WA: 'Western Australia',
  SA: 'South Australia',
  TAS: 'Tasmania',
  NT: 'Northern Territory',
  ACT: 'Australian Capital Territory',
};

export const JurisdictionalComparison = ({ data, totalHours = 0 }: JurisdictionalComparisonProps) => {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cross-Jurisdictional Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No jurisdictional data available. Ensure sites have state information recorded.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Sort by LTIFR descending (highest risk first)
  const sortedData = [...data].sort((a, b) => b.ltifr - a.ltifr);
  const avgLtifr = sortedData.reduce((sum, s) => sum + s.ltifr, 0) / sortedData.length;
  const totalIncidents = sortedData.reduce((sum, s) => sum + s.count, 0);

  // Find the worst and best performers
  const worstPerformer = sortedData[0];
  const bestPerformer = sortedData[sortedData.length - 1];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Cross-Jurisdictional Analysis</span>
          <Badge variant="outline" className="font-normal">
            {sortedData.length} state{sortedData.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Insights */}
        {worstPerformer.ltifr > INDUSTRY_BENCHMARKS.ltifr * 1.5 && (
          <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800 dark:text-red-200">
                  {STATE_NAMES[worstPerformer.state] || worstPerformer.state} requires attention
                </p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  LTIFR of {worstPerformer.ltifr.toFixed(1)} is {((worstPerformer.ltifr / INDUSTRY_BENCHMARKS.ltifr - 1) * 100).toFixed(0)}% above industry benchmark.
                  {worstPerformer.count > 0 && ` Recorded ${worstPerformer.count} incident${worstPerformer.count !== 1 ? 's' : ''}.`}
                </p>
              </div>
            </div>
          </div>
        )}

        {bestPerformer.ltifr < INDUSTRY_BENCHMARKS.ltifr * 0.5 && bestPerformer.count === 0 && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-emerald-800 dark:text-emerald-200">
                  {STATE_NAMES[bestPerformer.state] || bestPerformer.state} - Excellent performance
                </p>
                <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
                  Zero incidents recorded this period with strong hours coverage.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Comparison Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>State</TableHead>
              <TableHead className="text-center">Incidents</TableHead>
              <TableHead className="text-center">LTIFR</TableHead>
              <TableHead className="text-center">vs Benchmark</TableHead>
              <TableHead className="text-center">Risk Level</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((row) => {
              const benchmarkRatio = row.ltifr / INDUSTRY_BENCHMARKS.ltifr;
              const isAboveBenchmark = benchmarkRatio > 1.2;
              const isBelowBenchmark = benchmarkRatio < 0.8;
              const isAtBenchmark = !isAboveBenchmark && !isBelowBenchmark;
              
              let riskLevel: 'high' | 'medium' | 'low' = 'medium';
              if (benchmarkRatio > 1.5) riskLevel = 'high';
              else if (benchmarkRatio < 0.8) riskLevel = 'low';

              return (
                <TableRow key={row.state}>
                  <TableCell className="font-medium">
                    {STATE_NAMES[row.state] || row.state}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={cn(
                      "font-semibold",
                      row.count > 0 && "text-red-600 dark:text-red-400"
                    )}>
                      {row.count}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={cn(
                      "font-semibold tabular-nums",
                      isAboveBenchmark && "text-red-600 dark:text-red-400",
                      isBelowBenchmark && "text-emerald-600 dark:text-emerald-400"
                    )}>
                      {row.ltifr.toFixed(1)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className={cn(
                      "flex items-center justify-center gap-1 text-sm",
                      isAboveBenchmark && "text-red-600 dark:text-red-400",
                      isBelowBenchmark && "text-emerald-600 dark:text-emerald-400",
                      isAtBenchmark && "text-muted-foreground"
                    )}>
                      {isAboveBenchmark && <TrendingUp className="h-3 w-3" />}
                      {isBelowBenchmark && <TrendingDown className="h-3 w-3" />}
                      {isAtBenchmark && <Minus className="h-3 w-3" />}
                      <span>{((benchmarkRatio - 1) * 100).toFixed(0)}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge 
                      variant={riskLevel === 'high' ? 'destructive' : riskLevel === 'low' ? 'default' : 'secondary'}
                      className={cn(
                        riskLevel === 'low' && "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200"
                      )}
                    >
                      {riskLevel === 'high' ? 'High Risk' : riskLevel === 'low' ? 'Low Risk' : 'Moderate'}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-3 pt-4 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold">{totalIncidents}</p>
            <p className="text-sm text-muted-foreground">Total Incidents</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{avgLtifr.toFixed(1)}</p>
            <p className="text-sm text-muted-foreground">Average LTIFR</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{INDUSTRY_BENCHMARKS.ltifr}</p>
            <p className="text-sm text-muted-foreground">Industry Benchmark</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

