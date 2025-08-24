import { ClerkProvider as ClerkReactProvider, useUser, useAuth } from '@clerk/clerk-react';
import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Shared Clerk configuration
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  console.warn('Missing VITE_CLERK_PUBLISHABLE_KEY in environment variables');
}

interface ClerkUser {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  imageUrl?: string;
  role?: string;
}

interface ClerkAuthContextType {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: ClerkUser | null;
  signOut: () => Promise<void>;
  openSignIn: () => void;
}

const ClerkAuthContext = createContext<ClerkAuthContextType | null>(null);

export const useClerkAuth = () => {
  const context = useContext(ClerkAuthContext);
  if (!context) {
    throw new Error('useClerkAuth must be used within ClerkAuthProvider');
  }
  return context;
};

interface ClerkAuthProviderProps {
  children: ReactNode;
}

const ClerkAuthContextProvider = ({ children }: { children: ReactNode }) => {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut: clerkSignOut } = useAuth();
  const navigate = useNavigate();
  const [authState, setAuthState] = useState<ClerkAuthContextType>({
    isLoaded: false,
    isSignedIn: false,
    user: null,
    signOut: async () => {},
    openSignIn: () => {},
  });

  useEffect(() => {
    setAuthState({
      isLoaded,
      isSignedIn: !!isSignedIn,
      user: user ? {
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        imageUrl: user.imageUrl,
      } : null,
      signOut: async () => {
        await clerkSignOut();
        navigate('/');
      },
      openSignIn: () => {
        // Redirect to operations app login
        const operationsUrl = import.meta.env.VITE_OPERATIONS_URL || 'http://localhost:5173';
        window.location.href = `${operationsUrl}/auth/clerk-login`;
      },
    });
  }, [isLoaded, isSignedIn, user, clerkSignOut, navigate]);

  return (
    <ClerkAuthContext.Provider value={authState}>
      {children}
    </ClerkAuthContext.Provider>
  );
};

export const ClerkAuthProvider = ({ children }: ClerkAuthProviderProps) => {
  if (!CLERK_PUBLISHABLE_KEY) {
    // If no Clerk key, render children without authentication
    return <>{children}</>;
  }

  return (
    <ClerkReactProvider 
      publishableKey={CLERK_PUBLISHABLE_KEY}
      appearance={{
        elements: {
          formButtonPrimary: 'bg-primary hover:bg-primary/90',
          card: 'shadow-lg',
          headerTitle: 'text-2xl font-bold',
          headerSubtitle: 'text-gray-600',
        },
      }}
    >
      <ClerkAuthContextProvider>
        {children}
      </ClerkAuthContextProvider>
    </ClerkReactProvider>
  );
};