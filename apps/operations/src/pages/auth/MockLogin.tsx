import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMockAuthContext } from '@/lib/clerk/MockAuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function MockLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, isLoading, error } = useMockAuthContext();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn(email, password);
    // If successful, the DashboardRouter will handle redirect
    if (!error) {
      navigate('/');
    }
  };

  const quickLogin = async (email: string) => {
    setEmail(email);
    setPassword('DemoUser123!');
    await signIn(email, 'DemoUser123!');
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Mock Authentication Test</CardTitle>
          <CardDescription>
            Testing role-based routing without Clerk
          </CardDescription>
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
                placeholder="role1@scratchie.com"
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
                placeholder="DemoUser123!"
                required
              />
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          
          <div className="mt-6 space-y-2">
            <p className="text-sm text-gray-600 font-semibold">Quick Test Login:</p>
            <div className="grid grid-cols-1 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickLogin('role1@scratchie.com')}
              >
                Role 1 - Super Admin → /admin
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickLogin('role2@scratchie.com')}
              >
                Role 2 - Account Manager → /account-manager
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickLogin('role3@scratchie.com')}
              >
                Role 3 - Data Entry → /dashboard
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickLogin('role5@scratchie.com')}
              >
                Role 5 - Builder Admin → /builder-senior
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickLogin('role9@scratchie.com')}
              >
                Role 9 - Public User → /worker-portal
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Password for all: DemoUser123!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}