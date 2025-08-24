import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/lib/auth/authConfig';
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
  const { user: userData, isLoading, signOut } = useAuthContext();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
      navigate('/sign-in');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (!userData) {
    return null;
  }

  // Get initials for avatar
  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = userData?.custom_display_name || userData?.display_name || userData?.email || 'User';
  const email = userData?.email;
  const roleLabel = userData?.role?.role_label || 'No Role';
  const roleName = userData?.role?.role_name || '';

  // Role color mapping
  const getRoleColor = (roleName: string) => {
    const roleColors: Record<string, string> = {
      mend_super_admin: 'bg-red-500',
      mend_account_manager: 'bg-blue-500',
      mend_data_entry: 'bg-green-500',
      mend_analyst: 'bg-purple-500',
      builder_admin: 'bg-orange-500',
      builder_senior: 'bg-yellow-600',
      site_admin: 'bg-teal-500',
      administrator: 'bg-indigo-500',
      medical_professional: 'bg-pink-500',
    };
    return roleColors[roleName] || 'bg-gray-500';
  };

  return (
    <div className="flex items-center gap-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2 px-2 hover:bg-accent"
            disabled={isSigningOut}
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className={getRoleColor(roleName)}>
                <span className="text-white text-xs">{getInitials(displayName)}</span>
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start text-left">
              <span className="text-sm font-medium">{displayName}</span>
              <Badge variant="secondary" className="text-xs px-1 py-0">
                {roleLabel}
              </Badge>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{displayName}</p>
              <p className="text-xs text-muted-foreground">{email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* User Info Section */}
          <div className="px-2 py-2 space-y-1 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="h-3 w-3" />
              <span>Role: {roleLabel}</span>
            </div>
            {userData?.employer_id && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building className="h-3 w-3" />
                <span>Employer ID: {userData.employer_id}</span>
              </div>
            )}
            {userData?.site_id && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>Site ID: {userData.site_id}</span>
              </div>
            )}
          </div>
          
          <DropdownMenuSeparator />
          
          {/* Actions */}
          <DropdownMenuItem
            onClick={() => navigate('/account-settings')}
            className="cursor-pointer"
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Account Settings</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem
            onClick={() => navigate('/profile')}
            className="cursor-pointer"
          >
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            onClick={handleSignOut}
            className="cursor-pointer text-red-600 focus:text-red-600"
            disabled={isSigningOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}