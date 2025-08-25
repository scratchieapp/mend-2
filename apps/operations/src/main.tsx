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
          </AuthProvider>
        </ClerkProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </ErrorBoundary>
);