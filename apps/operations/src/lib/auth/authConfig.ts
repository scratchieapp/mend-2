// Centralized authentication configuration
// This file manages the switch between real Clerk auth and mock auth for testing

// Set this to false to use real Clerk authentication
export const USE_MOCK_AUTH = true;

// Import both auth providers
import { useClerkAuthContext as useRealAuth } from '@/lib/clerk/ClerkAuthProvider';
import { useClerkAuthContext as useMockAuth } from '@/lib/clerk/MockAuthProvider';
import { MockAuthProvider } from '@/lib/clerk/MockAuthProvider';
import { ClerkAuthProvider } from '@/lib/clerk/ClerkAuthProvider';

// Export the appropriate auth context based on configuration
export const useAuthContext = USE_MOCK_AUTH ? useMockAuth : useRealAuth;

// Export the appropriate provider component
export const AuthProvider = USE_MOCK_AUTH ? MockAuthProvider : ClerkAuthProvider;