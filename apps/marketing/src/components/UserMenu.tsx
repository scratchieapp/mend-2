import { useClerkAuth } from '@/lib/clerk/ClerkProvider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut, LayoutDashboard, Settings } from 'lucide-react';
import { getOperationsUrl } from '@/lib/config/environment';

export const UserMenu = () => {
  const { isLoaded, isSignedIn, user, signOut, openSignIn } = useClerkAuth();

  // Don't render anything until Clerk is loaded
  if (!isLoaded) {
    return (
      <div className="w-20 h-10 bg-gray-200 animate-pulse rounded-md" />
    );
  }

  // If not signed in, show sign in button
  if (!isSignedIn) {
    return (
      <Button onClick={openSignIn} variant="default" size="sm">
        Sign In
      </Button>
    );
  }

  // If signed in, show user menu
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">{user?.firstName || 'User'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.fullName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => {
            // Navigate to operations dashboard
            window.location.href = getOperationsUrl();
          }}
        >
          <LayoutDashboard className="mr-2 h-4 w-4" />
          <span>Go to Dashboard</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => {
            // Navigate to account settings in operations app
            window.location.href = `${getOperationsUrl()}/settings`;
          }}
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Account Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={signOut}
          className="text-red-600 focus:text-red-600"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};