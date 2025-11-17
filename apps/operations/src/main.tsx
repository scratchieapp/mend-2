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
      gcTime: 10 * 60 * 1000, // 10 minutes - matches our gentle cleanup interval
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
  const globalWindow = window as typeof window & {
    __mendMemoryCleanupTimers__?: number[];
    __mendMemoryCleanupUnloadHandler__?: () => void;
  };

  // Clear any existing timers registered during HMR to prevent accumulation
  if (Array.isArray(globalWindow.__mendMemoryCleanupTimers__)) {
    globalWindow.__mendMemoryCleanupTimers__!.forEach(timerId => clearInterval(timerId));
  }

  // Remove any previously registered unload handler to avoid duplicates
  if (typeof globalWindow.__mendMemoryCleanupUnloadHandler__ === 'function') {
    window.removeEventListener('beforeunload', globalWindow.__mendMemoryCleanupUnloadHandler__!);
  }

  const memoryCleanupTimers: number[] = [];

  // FIXED: Gentle memory cleanup that doesn't interfere with active queries
  // Only clean up truly stale queries that have been inactive for a long time
  memoryCleanupTimers.push(setInterval(() => {
    const allQueries = queryClient.getQueryCache().getAll();
    const now = Date.now();
    let removedCount = 0;

    allQueries.forEach(query => {
      const state = query.state;
      const hasNoObservers = query.getObserversCount() === 0;

      // CRITICAL: Only remove queries that meet ALL these conditions:
      // 1. No components are watching it (no observers)
      // 2. Not currently fetching (prevent race conditions)
      // 3. Data is very old (10+ minutes) OR never had data
      if (hasNoObservers && state.fetchStatus === 'idle') {
        const dataAge = state.dataUpdatedAt ? (now - state.dataUpdatedAt) : Infinity;
        const isVeryStale = dataAge > 10 * 60 * 1000; // 10 minutes - MUCH less aggressive

        if (isVeryStale) {
          queryClient.removeQueries({ queryKey: query.queryKey, exact: true });
          removedCount++;
        }
      }
    });

    if (import.meta.env.DEV && removedCount > 0) {
      console.log(`[Memory] Gently removed ${removedCount} stale queries (10+ min old, no observers)`);
    }
  }, 5 * 60 * 1000)); // Run every 5 minutes (was 20 seconds - way too aggressive!)

  // Monitoring only - no aggressive cleanup
  if (import.meta.env.DEV) {
    memoryCleanupTimers.push(setInterval(() => {
      const allQueries = queryClient.getQueryCache().getAll();
      const activeCount = allQueries.filter(q => q.getObserversCount() > 0).length;
      const totalCount = allQueries.length;

      if (totalCount > 50) {
        console.warn(`[Memory Monitor] ${totalCount} queries in cache (${activeCount} active, ${totalCount - activeCount} inactive)`);
      } else {
        console.log(`[Memory Monitor] ${totalCount} queries in cache (${activeCount} active)`);
      }
    }, 2 * 60 * 1000)); // Monitor every 2 minutes
  }

  globalWindow.__mendMemoryCleanupTimers__ = memoryCleanupTimers;

  // Cleanup intervals on window unload
  const unloadHandler = () => {
    memoryCleanupTimers.forEach(timer => clearInterval(timer));
    queryClient.clear(); // Clear entire cache on unload
    globalWindow.__mendMemoryCleanupTimers__ = undefined;
    globalWindow.__mendMemoryCleanupUnloadHandler__ = undefined;
  };

  window.addEventListener('beforeunload', unloadHandler);
  globalWindow.__mendMemoryCleanupUnloadHandler__ = unloadHandler;
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