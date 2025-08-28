import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Activity, AlertTriangle, CheckCircle, Clock, Database } from 'lucide-react';

interface PerformanceMetric {
  name: string;
  duration: number;
  status: 'good' | 'warning' | 'critical';
  timestamp: Date;
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development or if performance issues detected
    const isDev = process.env.NODE_ENV === 'development';
    const hasSlowQueries = metrics.some(m => m.status === 'critical');
    setIsVisible(isDev || hasSlowQueries);
  }, [metrics]);

  useEffect(() => {
    // Monitor RPC calls
    const originalRpc = (window as any).supabase?.rpc;
    if (originalRpc) {
      (window as any).supabase.rpc = async function(...args: any[]) {
        const functionName = args[0];
        const startTime = performance.now();
        
        try {
          const result = await originalRpc.apply(this, args);
          const duration = performance.now() - startTime;
          
          // Log performance metrics
          const status = duration < 500 ? 'good' : duration < 2000 ? 'warning' : 'critical';
          
          setMetrics(prev => [{
            name: functionName,
            duration,
            status,
            timestamp: new Date()
          }, ...prev.slice(0, 9)]); // Keep last 10 metrics
          
          // Log slow queries to console
          if (status === 'critical') {
            console.warn(`SLOW QUERY DETECTED: ${functionName} took ${duration.toFixed(0)}ms`, {
              function: functionName,
              params: args[1],
              duration: `${duration.toFixed(0)}ms`
            });
          }
          
          return result;
        } catch (error) {
          const duration = performance.now() - startTime;
          setMetrics(prev => [{
            name: `${functionName} (FAILED)`,
            duration,
            status: 'critical',
            timestamp: new Date()
          }, ...prev.slice(0, 9)]);
          throw error;
        }
      };
    }
  }, []);

  if (!isVisible || metrics.length === 0) return null;

  const averageTime = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
  const slowQueries = metrics.filter(m => m.status === 'critical').length;

  return (
    <Card className="fixed bottom-4 right-4 w-96 z-50 shadow-lg border-2">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Performance Monitor
          </span>
          <Badge variant={slowQueries > 0 ? 'destructive' : 'default'}>
            {slowQueries > 0 ? `${slowQueries} Slow` : 'OK'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {slowQueries > 0 && (
          <Alert variant="destructive" className="py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Detected {slowQueries} slow queries. Database optimization needed!
            </AlertDescription>
          </Alert>
        )}
        
        <div className="text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Average Response Time:</span>
            <span className={averageTime > 2000 ? 'text-red-500 font-bold' : ''}>
              {averageTime.toFixed(0)}ms
            </span>
          </div>
        </div>

        <div className="space-y-1 max-h-48 overflow-auto">
          {metrics.map((metric, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs py-1 border-b last:border-0">
              <div className="flex items-center gap-1 flex-1 truncate">
                {metric.status === 'good' ? (
                  <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                ) : metric.status === 'warning' ? (
                  <Clock className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="h-3 w-3 text-red-500 flex-shrink-0" />
                )}
                <span className="truncate">{metric.name}</span>
              </div>
              <span className={`ml-2 flex-shrink-0 ${
                metric.status === 'critical' ? 'text-red-500 font-bold' : 
                metric.status === 'warning' ? 'text-yellow-600' : 
                'text-green-600'
              }`}>
                {metric.duration.toFixed(0)}ms
              </span>
            </div>
          ))}
        </div>

        {metrics.length > 0 && metrics.every(m => m.name.includes('get_incidents_with_details_rbac')) && (
          <Alert className="py-2 bg-blue-50 border-blue-200">
            <Database className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Apply the performance fix: Run the migration in /supabase/migrations/20250828100000_ultra_performance_fix.sql
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}