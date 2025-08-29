import React, { useEffect, useState } from 'react';
import { ClerkProvider, useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/clerk-react';
import { supabase } from '@/integrations/supabase/client';
import { getRoleFromEmail } from '@/lib/auth/roleUtils';

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error('Missing Clerk Publishable Key');
}

// Log the Clerk configuration for debugging
console.log('🔑 Clerk Configuration Debug:');
console.log('Environment:', import.meta.env.MODE);
console.log('Clerk Key Present:', !!publishableKey);
console.log('Clerk Key Prefix:', publishableKey.substring(0, 15));

// Validate the key format
if (!publishableKey.startsWith('pk_')) {
  console.error('❌ Invalid Clerk publishable key format. It should start with "pk_"');
  throw new Error('Invalid Clerk publishable key format');
}

// Additional validation for environment
if (import.meta.env.MODE === 'production' && !publishableKey.includes('live')) {
  console.warn('⚠️ Using test key in production environment');
}

console.log('✅ Clerk publishable key is configured');

// Simplified component that just ensures user exists in DB
function ClerkAuthSync({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const { user: clerkUser } = useClerkUser();
  const [hasSynced, setHasSynced] = useState(false);

  useEffect(() => {
    const ensureUserExists = async () => {
      if (!isLoaded || !isSignedIn || !clerkUser || hasSynced) return;

      const email = clerkUser.primaryEmailAddress?.emailAddress;
      if (!email) return;

      try {
        // Check if user exists (minimal query)
        const { data: existingUser } = await supabase
          .from('users')
          .select('user_id')
          .eq('email', email)
          .single();

        if (!existingUser) {
          // Get role info from email
          const roleInfo = getRoleFromEmail(email);
          
          // Create user if doesn't exist
          await supabase.from('users').insert({
            clerk_user_id: clerkUser.id,
            email: email,
            display_name: clerkUser.fullName || clerkUser.firstName || email.split('@')[0],
            role_id: roleInfo.roleId,
            employer_id: roleInfo.employerId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
          console.log('✅ Created new user in Supabase');
        }
        
        setHasSynced(true);
      } catch (error) {
        console.error('Error ensuring user exists:', error);
      }
    };

    ensureUserExists();
  }, [isLoaded, isSignedIn, clerkUser, hasSynced]);

  return <>{children}</>;
}

export function ClerkAuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider publishableKey={publishableKey}>
      <ClerkAuthSync>
        {children}
      </ClerkAuthSync>
    </ClerkProvider>
  );
}
