import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ClearSession() {
  const navigate = useNavigate();

  const clearAllAuthData = () => {
    // Clear all Clerk-related cookies
    document.cookie.split(";").forEach((c) => {
      const cookie = c.trim();
      if (cookie.includes('__clerk') || cookie.includes('__session') || cookie.includes('__client')) {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        // Clear for all possible domains
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.mendplatform.au`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=mendplatform.au`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.clerk.com`;
      }
    });

    // Clear all localStorage items related to Clerk
    if (typeof window !== 'undefined' && window.localStorage) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('clerk') || key.includes('__clerk'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }

    // Clear sessionStorage as well
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.includes('clerk') || key.includes('__clerk'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => sessionStorage.removeItem(key));
    }

    // Show success message
    alert('Session cleared! Redirecting to login page...');
    
    // Redirect to Clerk login page
    setTimeout(() => {
      window.location.href = '/auth/clerk-login';
    }, 1000);
  };

  useEffect(() => {
    // Auto-clear on page load
    clearAllAuthData();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Clearing Session...</CardTitle>
          <CardDescription>
            Removing stale authentication data and redirecting to login page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            If you're not redirected automatically, click the button below:
          </p>
          <Button 
            onClick={() => navigate('/auth/clerk-login')} 
            className="w-full"
          >
            Go to Login Page
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}