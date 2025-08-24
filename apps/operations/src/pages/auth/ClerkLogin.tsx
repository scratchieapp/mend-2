import { SignIn } from '@clerk/clerk-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClerkAuthContext } from '@/lib/clerk/ClerkAuthProvider';
import { getClerkRedirectUrl } from '@/lib/config';

export default function ClerkLogin() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useClerkAuthContext();

  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('🔄 ClerkLogin: User authenticated, redirecting to dashboard...');
      // Redirect immediately to root to let DashboardRouter handle role-based routing
      // This ensures users go directly to their dashboard after login
      navigate('/', { replace: true });
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
            // After successful sign-in, redirect to root which will trigger DashboardRouter
            afterSignInUrl={getClerkRedirectUrl('/')}
            fallbackRedirectUrl={getClerkRedirectUrl('/')}
            signUpFallbackRedirectUrl={getClerkRedirectUrl('/sign-up')}
          />
        </CardContent>
      </Card>
    </div>
  );
}