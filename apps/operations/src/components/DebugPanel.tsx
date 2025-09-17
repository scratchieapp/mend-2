import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function DebugPanel() {
  // Only render in development AND when explicitly enabled
  const isEnabled = !import.meta.env.PROD && import.meta.env.VITE_DEBUG_PANEL === 'true';
  
  const queryClient = useQueryClient();
  const [activeQueries, setActiveQueries] = useState<string[]>([]);
  const [memoryUsage, setMemoryUsage] = useState<number>(0);
  const renderCount = useRef(0);
  
  renderCount.current++;
  
  useEffect(() => {
    // Don't run interval if not enabled
    if (!isEnabled) return;
    
    const interval = setInterval(() => {
      // Get active queries
      const queries = queryClient.getQueryCache().getAll();
      const activeKeys = queries
        .filter(q => q.state.fetchStatus === 'fetching')
        .map(q => JSON.stringify(q.queryKey))
        .slice(0, 5); // Limit to 5 queries max
      setActiveQueries(activeKeys);
      
      // Estimate memory usage
      if (performance && 'memory' in performance) {
        // @ts-expect-error - performance.memory is a non-standard API
        setMemoryUsage(Math.round(performance.memory.usedJSHeapSize / 1048576));
      }
    }, 5000); // Increased interval to reduce performance impact
    
    return () => clearInterval(interval);
  }, [queryClient, isEnabled]);
  
  // Return null if not enabled
  if (!isEnabled) return null;
  
  return (
    <Card className="fixed bottom-4 right-4 w-96 z-50 bg-black/90 text-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Debug Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span>Render Count:</span>
          <Badge variant="destructive">{renderCount.current}</Badge>
        </div>
        <div className="flex justify-between">
          <span>Memory Usage:</span>
          <Badge variant={memoryUsage > 500 ? "destructive" : "secondary"}>
            {memoryUsage} MB
          </Badge>
        </div>
        <div>
          <div className="font-semibold mb-1">Active Queries ({activeQueries.length}):</div>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {activeQueries.map((key, i) => (
              <div key={i} className="text-xs bg-white/10 px-1 py-0.5 rounded">
                {key}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
