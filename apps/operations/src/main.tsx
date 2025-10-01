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

// Aggressive cache cleanup to prevent memory leaks
if (typeof window !== 'undefined') {
  // Cleanup stale queries every 30 seconds
  setInterval(() => {
    const allQueries = queryClient.getQueryCache().getAll();
    const now = Date.now();

    allQueries.forEach(query => {
      const state = query.state;
      const isStale = state.dataUpdatedAt && (now - state.dataUpdatedAt > 5 * 60 * 1000); // 5 minutes
      const isIdle = state.fetchStatus === 'idle';
      const hasNoObservers = query.getObserversCount() === 0;

      // Remove queries that are stale, idle, and have no active observers
      if (isStale && isIdle && hasNoObservers) {
        queryClient.removeQueries({ queryKey: query.queryKey, exact: true });
      }
    });

    // Log cache size in development
    if (import.meta.env.DEV) {
      const remaining = queryClient.getQueryCache().getAll().length;
      if (remaining > 20) {
        console.warn(`[Memory] ${remaining} queries in cache - potential memory accumulation`);
      }
    }
  }, 30 * 1000); // Run every 30 seconds

  // Nuclear option: Clear all inactive queries every 3 minutes
  setInterval(() => {
    const allQueries = queryClient.getQueryCache().getAll();
    const activeCount = allQueries.filter(q => q.getObserversCount() > 0).length;
    const totalCount = allQueries.length;

    // If we have more than 30 cached queries and less than 30% are active, clear inactive ones
    if (totalCount > 30 && (activeCount / totalCount) < 0.3) {
      queryClient.removeQueries({
        predicate: (query) => query.getObserversCount() === 0
      });

      if (import.meta.env.DEV) {
        console.log(`[Memory] Cleared ${totalCount - activeCount} inactive queries`);
      }
    }
  }, 3 * 60 * 1000); // Run every 3 minutes
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