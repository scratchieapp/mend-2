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
      staleTime: 10 * 1000, // 10 seconds - more aggressive cache invalidation
      gcTime: 30 * 1000, // 30 seconds garbage collection - prevent memory buildup
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      structuralSharing: false, // Prevent deep object comparison memory leaks
      networkMode: 'online', // Only fetch when online
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
      networkMode: 'online',
    },
  },
});

// Cleanup stale cache periodically to prevent memory buildup
if (typeof window !== 'undefined') {
  setInterval(() => {
    queryClient.getQueryCache().getAll().forEach(query => {
      const state = query.state;
      // Remove queries older than 5 minutes that aren't active
      if (state.dataUpdatedAt && Date.now() - state.dataUpdatedAt > 5 * 60 * 1000) {
        if (state.fetchStatus === 'idle') {
          queryClient.removeQueries({ queryKey: query.queryKey, exact: true });
        }
      }
    });
  }, 60 * 1000); // Run every minute
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