import { SignIn } from '@clerk/clerk-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClerkAuthContext } from '@/lib/clerk/ClerkAuthProvider';
import { getOperationsUrl, isProduction } from '@/lib/config';

// Simple role-based dashboard mapping
const ROLE_DASHBOARDS: Record<number, string> = {
  1: '/admin',              // role1@scratchie.com → AdminDashboard
  2: '/account-manager',    // role2@scratchie.com → AccountManager
  3: '/dashboard',          // role3@scratchie.com → Dashboard
  4: '/dashboard',          // role4 → Dashboard
  5: '/builder-senior',     // role5@scratchie.com → BuilderSeniorDashboard
  6: '/site-admin',         // role6 → SiteAdmin
  7: '/worker-portal',      // role7 → WorkerPortal
  8: '/dashboard',          // role8 → Dashboard
  9: '/worker-portal',      // role9 → WorkerPortal
};

export default function ClerkLogin() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useClerkAuthContext();

  useEffect(() => {
    console.log('🔍 ClerkLogin useEffect triggered:', { 
      isAuthenticated, 
      hasUser: !!user, 
      userEmail: user?.email,
      userRole: user?.role?.role_name,
      currentPath: window.location.pathname,
      currentUrl: window.location.href
    });
    
    if (isAuthenticated && user) {
      console.log('🔄 ClerkLogin: User authenticated, redirecting to dashboard...');
      console.log('🔄 ClerkLogin: User details:', {
        role_id: user.role?.role_id,
        role_name: user.role?.role_name,
        email: user.email
      });
      
      // Direct redirect to the correct dashboard based on role
      const roleId = user.role?.role_id;
      const dashboardPath = roleId ? ROLE_DASHBOARDS[roleId] : '/dashboard';
      
      console.log(`🎯 ClerkLogin: Redirecting role ${roleId} to ${dashboardPath}`);
      navigate(dashboardPath, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Welcome to Mend Safety</CardTitle>
          <CardDescription>
            Sign in to access your workplace safety dashboard
          </CardDescription>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Demo Accounts:</strong><br />
              role1@scratchie.com - Super Admin<br />
              role2@scratchie.com - Account Manager<br />
              role3@scratchie.com - Data Entry<br />
              role5@scratchie.com - Builder Admin
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <SignIn 
            appearance={{
              elements: {
                formButtonPrimary: 'bg-primary hover:bg-primary/90 text-white',
                card: 'shadow-none',
                headerTitle: 'hidden',
                headerSubtitle: 'hidden',
                socialButtonsBlockButton: 'hidden',
                dividerRow: 'hidden',
                formFieldInput: 'border-gray-300',
                footerActionLink: 'text-primary hover:text-primary/90',
              },
            }}
            // Remove afterSignInUrl to let useEffect handle redirects
            // This prevents conflicting redirect logic
            signUpUrl={'/sign-up'}
          />
        </CardContent>
      </Card>
    </div>
  );
}