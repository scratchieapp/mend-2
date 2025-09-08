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

// Debug Clerk configuration
console.log('🔑 Clerk Configuration Debug:');
console.log('Environment:', import.meta.env.MODE);
console.log('Clerk Key Present:', !!clerkPubKey);
console.log('Clerk Key Prefix:', clerkPubKey?.substring(0, 15));

if (!clerkPubKey) {
  console.error('❌ VITE_CLERK_PUBLISHABLE_KEY is not set!');
} else {
  console.log('✅ Clerk publishable key is configured');
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // DISABLED globally to prevent delays
      staleTime: 30 * 1000, // 30 seconds (reduced from 5 minutes)
      gcTime: 60 * 1000, // 1 minute garbage collection (was cacheTime)
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      structuralSharing: false, // Prevent deep object comparison memory leaks
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
  // Add query cache configuration to limit memory usage
  queryCache: {
    onError: (error) => {
      console.error('Query error:', error);
    },
  },
});

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