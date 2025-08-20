// src/pages/auth/Login.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { loginSchema, type LoginFormData } from '@/lib/validations/user';

export default function Login() {
  const { signIn, isLoading, error, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [hasNavigated, setHasNavigated] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setFocus,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Focus on email field on mount
  useEffect(() => {
    setFocus('email');
  }, [setFocus]);

  // Handle navigation after successful authentication
  useEffect(() => {
    if (isAuthenticated && !hasNavigated) {
      navigate('/');
      setHasNavigated(true);
    }
  }, [isAuthenticated, navigate, hasNavigated]);

  // Update submit error when auth error changes
  useEffect(() => {
    if (error) {
      setSubmitError(error);
    }
  }, [error]);

  const onSubmit = async (data: LoginFormData) => {
    if (isLoading || isSubmitting) {
      return; // Prevent multiple submissions
    }
    
    setSubmitError(null);
    
    try {
      await signIn(data.email, data.password);
      // Navigation handled by useEffect
    } catch (err) {
      // Error is handled in AuthContext and will appear in `error` state
      const errorMessage = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setSubmitError(errorMessage);
    }
  };

  const getErrorMessage = (error: string) => {
    const errorMessages: Record<string, string> = {
      "Failed to fetch user data": "Network error. Please check your connection and try again.",
      "Login failed after retries": "Unable to connect to server. Please try again later.",
      "Invalid login credentials": "Invalid email or password. Please try again.",
      "User account is disabled": "Your account has been disabled. Please contact support.",
      "Too many login attempts": "Too many failed attempts. Please wait a few minutes.",
    };
    
    return errorMessages[error] || error;
  };

  const isFormLoading = isLoading || isSubmitting;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                {...register('email')}
                id="email"
                type="email"
                placeholder="name@company.com"
                autoComplete="email"
                disabled={isFormLoading}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-red-500">
                  {errors.email.message}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                {...register('password')}
                id="password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={isFormLoading}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : undefined}
              />
              {errors.password && (
                <p id="password-error" className="text-sm text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>

            {submitError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {getErrorMessage(submitError)}
                </AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              disabled={isFormLoading} 
              className="w-full"
            >
              {isFormLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>

            <div className="text-center text-sm text-gray-600">
              <a 
                href="#" 
                className="hover:text-primary transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  // TODO: Implement forgot password
                }}
              >
                Forgot your password?
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}