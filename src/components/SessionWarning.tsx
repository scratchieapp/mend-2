import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Clock, RefreshCw, LogOut } from 'lucide-react';

export function SessionWarning() {
  const { 
    isSessionExpiring, 
    sessionExpiresAt, 
    refreshSession, 
    signOut,
    isLoading 
  } = useAuth();
  
  const [countdown, setCountdown] = useState<string>('');

  useEffect(() => {
    if (!isSessionExpiring || !sessionExpiresAt) {
      setCountdown('');
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const expiryTime = sessionExpiresAt.getTime();
      const timeRemaining = expiryTime - now;

      if (timeRemaining <= 0) {
        setCountdown('Session expired');
        return;
      }

      const minutes = Math.floor(timeRemaining / (1000 * 60));
      const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
      
      setCountdown(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    // Update immediately
    updateCountdown();

    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [isSessionExpiring, sessionExpiresAt]);

  if (!isSessionExpiring) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-4">
      <Alert variant="destructive" className="mx-auto max-w-md">
        <Clock className="h-4 w-4" />
        <AlertTitle>Session Expiring Soon</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="mb-3">
            Your session will expire in <strong>{countdown}</strong>. 
            Please refresh your session to continue.
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={refreshSession}
              disabled={isLoading}
              className="bg-background"
            >
              <RefreshCw className="mr-2 h-3 w-3" />
              Refresh Session
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={signOut}
              disabled={isLoading}
            >
              <LogOut className="mr-2 h-3 w-3" />
              Sign Out
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}