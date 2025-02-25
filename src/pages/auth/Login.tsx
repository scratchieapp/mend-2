// src/pages/auth/Login.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, isLoading, error, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [hasNavigated, setHasNavigated] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('Login component state:', { isAuthenticated, isLoading, error, hasNavigated });
  }, [isAuthenticated, isLoading, error, hasNavigated]);

  // Handle navigation after successful authentication
  useEffect(() => {
    if (isAuthenticated && !hasNavigated) {
      console.log('Authenticated, navigating to /');
      navigate('/');
      setHasNavigated(true);
    }
  }, [isAuthenticated, navigate, hasNavigated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) {
      console.log('Login already in progress, ignoring submission');
      return; // Prevent multiple submissions
    }
    
    try {
      console.log('Login attempt with email:', email);
      await signIn(email, password);
      // Don't navigate here, let the useEffect handle navigation
    } catch (err) {
      console.error('Login error:', err);
      // Error handled in AuthContext
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-red-500 text-sm">
                {error === "Failed to fetch user data"
                  ? "Network error fetching user data. Please try again."
                  : error === "Login failed after retries"
                  ? "Login failed due to network issues. Check your connection and retry."
                  : error}
              </p>
            )}
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}