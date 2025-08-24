import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useClerk } from '@clerk/clerk-react';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  User,
  LogOut,
  Settings,
  Shield,
  Building,
  MapPin,
  ChevronDown,
} from 'lucide-react';

export function UserBadge() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user?.primaryEmailAddress?.emailAddress) return;

      const { data } = await supabase
        .from('users')
        .select('role:user_roles!role_id(role_label)')
        .eq('email', user.primaryEmailAddress.emailAddress)
        .single();

      if (data?.role?.role_label) {
        setUserRole(data.role.role_label);
      }
    };

    fetchUserRole();
  }, [user]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      navigate('/sign-in');
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  if (!user) {
    return null;
  }

  const userEmail = user.primaryEmailAddress?.emailAddress || '';
  const userName = user.fullName || user.firstName || userEmail.split('@')[0];
  const userInitials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const getRoleBadgeColor = (role: string) => {
    const roleColors: Record<string, string> = {
      'Super Admin': 'bg-red-500',
      'Account Manager': 'bg-purple-500',
      'Data Entry': 'bg-blue-500',
      'Builder Junior': 'bg-green-500',
      'Builder Senior': 'bg-teal-500',
      'Medical Professional': 'bg-pink-500',
      'Insurance Provider': 'bg-orange-500',
      'Government Official': 'bg-yellow-500',
      'Administrator': 'bg-indigo-500',
    };
    return roleColors[role] || 'bg-gray-500';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 px-2">
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.imageUrl} alt={userName} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">{userName}</span>
              {userRole && (
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${getRoleBadgeColor(userRole)} text-white`}
                >
                  {userRole}
                </Badge>
              )}
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-2">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.imageUrl} alt={userName} />
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <p className="text-sm font-medium leading-none">{userName}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {userEmail}
                </p>
              </div>
            </div>
            {userRole && (
              <div className="flex items-center space-x-2 px-2">
                <Shield className="h-3 w-3" />
                <span className="text-xs">Role: {userRole}</span>
              </div>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/user')}>
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/settings')}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="text-red-600"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{isSigningOut ? 'Signing out...' : 'Sign out'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}