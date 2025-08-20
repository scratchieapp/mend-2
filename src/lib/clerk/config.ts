// Clerk configuration
export const clerkConfig = {
  // Clerk publishable key will be added to .env
  publishableKey: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '',
  
  // Sign in/up URLs
  signInUrl: '/auth/login',
  signUpUrl: '/auth/signup',
  afterSignInUrl: '/dashboard',
  afterSignUpUrl: '/dashboard',
  
  // Appearance customization
  appearance: {
    elements: {
      formButtonPrimary: 'bg-primary hover:bg-primary/90',
      card: 'shadow-lg',
      headerTitle: 'text-2xl font-bold',
      headerSubtitle: 'text-gray-600',
    },
  },
};

// Role mapping from Clerk metadata to your existing roles
export const ROLE_MAPPINGS = {
  'role1@scratchie.com': { role_id: 1, role_name: 'mend_super_admin' },
  'role2@scratchie.com': { role_id: 2, role_name: 'mend_account_manager' },
  'role3@scratchie.com': { role_id: 3, role_name: 'mend_data_entry' },
  'role4@scratchie.com': { role_id: 4, role_name: 'mend_analyst' },
  'role5@scratchie.com': { role_id: 5, role_name: 'builder_admin' },
  'role6@scratchie.com': { role_id: 6, role_name: 'site_admin' },
  'role7@scratchie.com': { role_id: 7, role_name: 'client' },
  'role8@scratchie.com': { role_id: 8, role_name: 'vendor' },
  'role9@scratchie.com': { role_id: 9, role_name: 'public' },
};

// Get role info based on email
export function getRoleFromEmail(email: string) {
  return ROLE_MAPPINGS[email as keyof typeof ROLE_MAPPINGS] || { role_id: 9, role_name: 'public' };
}