// src/pages/auth/Login.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignIn, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { Card } from '@/components/ui/card';

export default function Login() {
  const { isSignedIn } = useClerkAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isSignedIn) {
      navigate('/');
    }
  }, [isSignedIn, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Card className="w-full max-w-md shadow-lg p-0 overflow-hidden">
        <SignIn 
          appearance={{
            elements: {
              rootBox: 'w-full',
              card: 'shadow-none border-0',
              formButtonPrimary: 'bg-primary hover:bg-primary/90',
              headerTitle: 'text-2xl font-bold',
              headerSubtitle: 'text-gray-600',
              formFieldInput: 'border-gray-300',
              footerActionLink: 'text-primary hover:text-primary/80',
            },
          }}
          redirectUrl="/"
          signUpUrl="/auth/signup"
        />
      </Card>
    </div>
  );
}