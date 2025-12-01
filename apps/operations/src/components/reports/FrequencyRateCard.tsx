import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { INDUSTRY_BENCHMARKS } from "@/types/reports";

interface FrequencyRateCardProps {
  title: string;
  rate: number;
  benchmark?: number;
  previousRate?: number;
  description?: string;
  variant?: 'ltifr' | 'trifr' | 'mtifr';
}

export const FrequencyRateCard = ({
  title,
  rate,
  benchmark,
  previousRate,
  description,
  variant = 'ltifr',
}: FrequencyRateCardProps) => {
  const defaultBenchmark = variant === 'ltifr' 
    ? INDUSTRY_BENCHMARKS.ltifr 
    : variant === 'trifr' 
      ? INDUSTRY_BENCHMARKS.trifr 
      : INDUSTRY_BENCHMARKS.mtifr;
  
  const effectiveBenchmark = benchmark ?? defaultBenchmark;
  
  // Calculate change from previous period
  const change = previousRate !== undefined && previousRate > 0
    ? ((rate - previousRate) / previousRate) * 100
    : null;

  // Determine performance against benchmark
  const performanceRatio = rate / effectiveBenchmark;
  const isGood = performanceRatio < 0.8;
  const isWarning = performanceRatio >= 0.8 && performanceRatio <= 1.2;
  const isBad = performanceRatio > 1.2;

  // Colors based on variant
  const variantColors = {
    ltifr: {
      good: 'text-emerald-600 dark:text-emerald-400',
      warning: 'text-amber-600 dark:text-amber-400',
      bad: 'text-red-600 dark:text-red-400',
      bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20',
      border: 'border-emerald-200 dark:border-emerald-800',
    },
    trifr: {
      good: 'text-blue-600 dark:text-blue-400',
      warning: 'text-amber-600 dark:text-amber-400',
      bad: 'text-red-600 dark:text-red-400',
      bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
    },
    mtifr: {
      good: 'text-violet-600 dark:text-violet-400',
      warning: 'text-amber-600 dark:text-amber-400',
      bad: 'text-red-600 dark:text-red-400',
      bg: 'bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-950/30 dark:to-violet-900/20',
      border: 'border-violet-200 dark:border-violet-800',
    },
  };

  const colors = variantColors[variant];
  const rateColor = isGood ? colors.good : isWarning ? colors.warning : colors.bad;

  return (
    <Card className={cn("relative overflow-hidden", colors.bg, colors.border)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-4xl font-bold tabular-nums", rateColor)}>
                {rate.toFixed(1)}
              </span>
              <span className="text-sm text-muted-foreground">per million hours</span>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1">
            {/* Benchmark indicator */}
            {isGood && (
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="h-4 w-4" />
                <span className="text-xs font-medium">Below benchmark</span>
              </div>
            )}
            {isBad && (
              <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs font-medium">Above benchmark</span>
              </div>
            )}
            
            {/* Trend indicator */}
            {change !== null && (
              <div className={cn(
                "flex items-center gap-1 text-xs font-medium",
                change < 0 ? "text-emerald-600 dark:text-emerald-400" : 
                change > 0 ? "text-red-600 dark:text-red-400" : 
                "text-muted-foreground"
              )}>
                {change < 0 ? (
                  <TrendingDown className="h-3 w-3" />
                ) : change > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <Minus className="h-3 w-3" />
                )}
                <span>{Math.abs(change).toFixed(1)}% vs prev</span>
              </div>
            )}
          </div>
        </div>

        {/* Benchmark comparison bar */}
        <div className="mt-4 space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0</span>
            <span>Benchmark: {effectiveBenchmark}</span>
            <span>{effectiveBenchmark * 2}</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all",
                isGood ? "bg-emerald-500" : isWarning ? "bg-amber-500" : "bg-red-500"
              )}
              style={{ width: `${Math.min(performanceRatio * 50, 100)}%` }}
            />
          </div>
        </div>

        {description && (
          <p className="mt-3 text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
};

