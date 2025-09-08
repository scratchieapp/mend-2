import React, { useEffect, useRef, useState } from 'react';
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
  const [fetchLogs, setFetchLogs] = useState<{ url: string; ms: number; at: Date }[]>([]);
  const [longTasks, setLongTasks] = useState<{ duration: number; start: number }[]>([]);
  const [maxEventLoopLag, setMaxEventLoopLag] = useState(0);
  const fetchPatchedRef = useRef(false);

  useEffect(() => {
    // Only show in development or if performance issues detected
    const isDev = process.env.NODE_ENV === 'development';
    const hasSlowQueries = metrics.some(m => m.status === 'critical');
    setIsVisible(isDev || hasSlowQueries);
  }, [metrics]);

  useEffect(() => {
    // Skip if disabled via environment variable
    if (import.meta.env.VITE_DISABLE_PERF_MONITOR === 'true') return;
    
    // Monitor RPC calls - FIXED to prevent recursive calls
    const supabaseClient = (window as any).supabase;
    if (!supabaseClient || !supabaseClient.rpc) return;
    
    // Check if already patched to prevent double-patching
    if (supabaseClient._originalRpc) return;
    
    // Store the original function
    const originalRpc = supabaseClient.rpc.bind(supabaseClient);
    supabaseClient._originalRpc = originalRpc;
    
    // Create the monitoring wrapper
    supabaseClient.rpc = async function(...args: any[]) {
      const functionName = args[0];
      const startTime = performance.now();
      
      try {
        // Call the ORIGINAL function, not the patched one
        const result = await originalRpc(...args);
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
    
    // Cleanup on unmount
    return () => {
      if (supabaseClient._originalRpc) {
        supabaseClient.rpc = supabaseClient._originalRpc;
        delete supabaseClient._originalRpc;
      }
    };
  }, []);

  // Patch fetch to measure actual network time to Supabase RPC endpoints (dev-only aide)
  useEffect(() => {
    if (fetchPatchedRef.current) return;
    if (import.meta.env.VITE_SHOW_PERF_MONITOR !== 'true') return;
    if (typeof window === 'undefined' || !window.fetch) return;

    const originalFetch = window.fetch.bind(window);
    fetchPatchedRef.current = true;
    window.fetch = async (...args: any[]) => {
      const url = String(args[0]);
      const isSupabaseRpc = url.includes('/rpc/');
      const t0 = performance.now();
      try {
        const res = await originalFetch(...args);
        const t1 = performance.now();
        if (isSupabaseRpc) {
          setFetchLogs(prev => [{ url, ms: t1 - t0, at: new Date() }, ...prev.slice(0, 9)]);
        }
        return res;
      } catch (e) {
        const t1 = performance.now();
        if (isSupabaseRpc) {
          setFetchLogs(prev => [{ url, ms: t1 - t0, at: new Date() }, ...prev.slice(0, 9)]);
        }
        throw e;
      }
    };

    return () => {
      // Best-effort restore
      window.fetch = originalFetch;
    };
  }, []);

  // Observe long tasks on the main thread
  useEffect(() => {
    const supported = (window as any).PerformanceObserver?.supportedEntryTypes?.includes('longtask');
    if (!supported) return;
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const mapped = entries.map(e => ({ duration: e.duration, start: e.startTime }));
      setLongTasks(prev => [...mapped.reverse(), ...prev].slice(0, 10));
    });
    observer.observe({ entryTypes: ['longtask'] as any });
    return () => observer.disconnect();
  }, []);

  // Sample event loop lag
  useEffect(() => {
    let mounted = true;
    let last = performance.now();
    const interval = setInterval(() => {
      const now = performance.now();
      const expected = 100;
      const lag = now - last - expected;
      if (lag > 0 && mounted) setMaxEventLoopLag(prev => Math.max(prev, lag));
      last = now;
    }, 100);
    return () => { mounted = false; clearInterval(interval); };
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
          <div className="flex justify-between">
            <span className="text-muted-foreground">Max Event Loop Lag:</span>
            <span className={maxEventLoopLag > 500 ? 'text-red-500 font-bold' : ''}>
              {maxEventLoopLag.toFixed(0)}ms
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

        {/* Fetch logs for Supabase RPCs */}
        {fetchLogs.length > 0 && (
          <div className="mt-2 text-xs">
            <div className="font-semibold mb-1">RPC Fetch (network) timings:</div>
            <div className="space-y-1 max-h-32 overflow-auto">
              {fetchLogs.map((f, i) => (
                <div key={i} className="flex justify-between">
                  <span className="truncate mr-2">{f.url.split('/rpc/')[1] || f.url}</span>
                  <span>{f.ms.toFixed(0)}ms</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Long tasks */}
        {longTasks.length > 0 && (
          <div className="mt-2 text-xs">
            <div className="font-semibold mb-1">Long Tasks (main thread):</div>
            <div className="space-y-1 max-h-32 overflow-auto">
              {longTasks.map((t, i) => (
                <div key={i} className={`flex justify-between ${t.duration > 1000 ? 'text-red-500 font-bold' : ''}`}>
                  <span>Start {t.start.toFixed(0)}ms</span>
                  <span>{t.duration.toFixed(0)}ms</span>
                </div>
              ))}
            </div>
          </div>
        )}

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
