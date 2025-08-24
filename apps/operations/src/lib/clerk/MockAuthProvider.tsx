import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserData } from '@/lib/auth/roles';
import { useNavigate } from 'react-router-dom';

// Mock users with different roles for testing
const MOCK_USERS: Record<string, UserData> = {
  'role1@scratchie.com': {
    user_id: 'mock-user-1',
    email: 'role1@scratchie.com',
    display_name: 'Super Admin',
    custom_display_name: 'Super Admin',
    role_id: 1,
    role: {
      role_id: 1,
      role_name: 'mend_super_admin',
      role_label: 'MEND Super Admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    clerk_user_id: 'mock-clerk-1'
  } as UserData,
  'role2@scratchie.com': {
    user_id: 'mock-user-2',
    email: 'role2@scratchie.com',
    display_name: 'Account Manager',
    custom_display_name: 'Account Manager',
    role_id: 2,
    role: {
      role_id: 2,
      role_name: 'mend_account_manager',
      role_label: 'MEND Account Manager',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    clerk_user_id: 'mock-clerk-2'
  } as UserData,
  'role3@scratchie.com': {
    user_id: 'mock-user-3',
    email: 'role3@scratchie.com',
    display_name: 'Data Entry',
    custom_display_name: 'Data Entry',
    role_id: 3,
    role: {
      role_id: 3,
      role_name: 'mend_data_entry',
      role_label: 'MEND Data Entry',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    clerk_user_id: 'mock-clerk-3'
  } as UserData,
  'role5@scratchie.com': {
    user_id: 'mock-user-5',
    email: 'role5@scratchie.com',
    display_name: 'Builder Admin',
    custom_display_name: 'Builder Admin',
    role_id: 5,
    role: {
      role_id: 5,
      role_name: 'builder_admin',
      role_label: 'Builder Admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    clerk_user_id: 'mock-clerk-5'
  } as UserData,
  'role9@scratchie.com': {
    user_id: 'mock-user-9',
    email: 'role9@scratchie.com',
    display_name: 'Public User',
    custom_display_name: 'Public User',
    role_id: 9,
    role: {
      role_id: 9,
      role_name: 'public',
      role_label: 'Public User',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    clerk_user_id: 'mock-clerk-9'
  } as UserData,
};

interface MockAuthContextType {
  user: UserData | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
}

const MockAuthContext = createContext<MockAuthContextType | undefined>(undefined);

export function useMockAuthContext() {
  const context = useContext(MockAuthContext);
  if (!context) {
    throw new Error('useMockAuthContext must be used within MockAuthProvider');
  }
  return context;
}

export function MockAuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for stored mock session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('mockUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const mockUser = MOCK_USERS[email];
    if (mockUser && password === 'DemoUser123!') {
      setUser(mockUser);
      localStorage.setItem('mockUser', JSON.stringify(mockUser));
      console.log('🔍 MockAuth: User signed in:', {
        email: mockUser.email,
        role_id: mockUser.role_id,
        role_name: mockUser.role?.role_name
      });
    } else {
      setError('Invalid email or password');
    }
    
    setIsLoading(false);
  };

  const signOut = async () => {
    setUser(null);
    localStorage.removeItem('mockUser');
    navigate('/sign-in');
  };

  const contextValue: MockAuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signOut,
    error,
  };

  return (
    <MockAuthContext.Provider value={contextValue}>
      {children}
    </MockAuthContext.Provider>
  );
}

// Export a hook that matches the Clerk auth context interface
export function useClerkAuthContext() {
  return useMockAuthContext();
}