import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function DebugPanel() {
  const queryClient = useQueryClient();
  const [activeQueries, setActiveQueries] = useState<string[]>([]);
  const [memoryUsage, setMemoryUsage] = useState<number>(0);
  const renderCount = useRef(0);
  
  renderCount.current++;
  
  useEffect(() => {
    const interval = setInterval(() => {
      // Get active queries
      const queries = queryClient.getQueryCache().getAll();
      const activeKeys = queries
        .filter(q => q.state.fetchStatus === 'fetching')
        .map(q => JSON.stringify(q.queryKey));
      setActiveQueries(activeKeys);
      
      // Estimate memory usage
      if (performance && 'memory' in performance) {
        // @ts-ignore
        setMemoryUsage(Math.round(performance.memory.usedJSHeapSize / 1048576));
      }
    }, 2000); // Reduced frequency to avoid performance impact
    
    return () => clearInterval(interval);
  }, [queryClient]);
  
  // Only show in development
  if (import.meta.env.PROD) return null;
  
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
