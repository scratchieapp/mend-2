// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
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
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
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
            {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
          </AuthProvider>
        </ClerkProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </ErrorBoundary>
);