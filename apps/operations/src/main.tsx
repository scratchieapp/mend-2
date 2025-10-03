// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider } from '@clerk/clerk-react';
import ErrorBoundary from '@/components/ErrorBoundary';
import { AuthProvider } from '@/lib/auth/AuthContext';
import App from './App';
import './index.css';

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Only log in development
if (import.meta.env.DEV) {
  console.log('🔑 Clerk Configuration Debug:');
  console.log('Environment:', import.meta.env.MODE);
  console.log('Clerk Key Present:', !!clerkPubKey);
  console.log('Clerk Key Prefix:', clerkPubKey?.substring(0, 15));

  if (!clerkPubKey) {
    console.error('❌ VITE_CLERK_PUBLISHABLE_KEY is not set!');
  } else {
    console.log('✅ Clerk publishable key is configured');
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // DISABLED globally to prevent delays
      staleTime: 30 * 1000, // 30 seconds - balanced freshness
      gcTime: 5 * 60 * 1000, // 5 minutes garbage collection - prevent premature disposal
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      structuralSharing: true, // Re-enabled with proper memoization to save memory
      networkMode: 'online', // Only fetch when online
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
      networkMode: 'online',
    },
  },
});

// ENHANCED: More aggressive memory leak prevention
if (typeof window !== 'undefined') {
  const memoryCleanupTimers: number[] = [];

  // Aggressive query cleanup every 20 seconds
  memoryCleanupTimers.push(setInterval(() => {
    const allQueries = queryClient.getQueryCache().getAll();
    const now = Date.now();
    let removedCount = 0;

    allQueries.forEach(query => {
      const state = query.state;
      const dataAge = state.dataUpdatedAt ? (now - state.dataUpdatedAt) : Infinity;
      const isStale = dataAge > 2 * 60 * 1000; // 2 minutes (more aggressive)
      const isIdle = state.fetchStatus === 'idle';
      const hasNoObservers = query.getObserversCount() === 0;

      // More aggressive removal conditions
      if ((isStale && hasNoObservers) || (isIdle && hasNoObservers && dataAge > 60000)) {
        queryClient.removeQueries({ queryKey: query.queryKey, exact: true });
        removedCount++;
      }
    });

    if (import.meta.env.DEV && removedCount > 0) {
      console.log(`[Memory] Cleaned ${removedCount} stale queries`);
    }
  }, 20 * 1000)); // Run every 20 seconds

  // Clear inactive queries every minute (more frequent)
  memoryCleanupTimers.push(setInterval(() => {
    const allQueries = queryClient.getQueryCache().getAll();
    const activeCount = allQueries.filter(q => q.getObserversCount() > 0).length;
    const totalCount = allQueries.length;

    // More aggressive threshold: clear if more than 15 queries
    if (totalCount > 15) {
      const removed = queryClient.removeQueries({
        predicate: (query) => query.getObserversCount() === 0
      });

      if (import.meta.env.DEV && removed) {
        console.log(`[Memory] Aggressive cleanup: ${totalCount - activeCount} inactive queries removed`);
      }
    }

    // CRITICAL: Monitor total memory usage
    if (import.meta.env.DEV && totalCount > 10) {
      console.warn(`[Memory Warning] ${totalCount} queries in cache (${activeCount} active)`);
    }
  }, 60 * 1000)); // Run every minute

  // CRITICAL: Nuclear cleanup every 2 minutes to prevent Chrome crashes
  memoryCleanupTimers.push(setInterval(() => {
    const allQueries = queryClient.getQueryCache().getAll();

    // Force clear all queries with no observers
    allQueries.forEach(query => {
      if (query.getObserversCount() === 0) {
        query.destroy(); // Use destroy for immediate cleanup
      }
    });

    // Force garbage collection hint (browser may ignore)
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }

    if (import.meta.env.DEV) {
      const remaining = queryClient.getQueryCache().getAll().length;
      console.log(`[Memory] Nuclear cleanup complete. ${remaining} queries remain.`);
    }
  }, 2 * 60 * 1000)); // Run every 2 minutes

  // Cleanup intervals on window unload
  window.addEventListener('beforeunload', () => {
    memoryCleanupTimers.forEach(timer => clearInterval(timer));
    queryClient.clear(); // Clear entire cache on unload
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ClerkProvider publishableKey={clerkPubKey}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ClerkProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </ErrorBoundary>
);