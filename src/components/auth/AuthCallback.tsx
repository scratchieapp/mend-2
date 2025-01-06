import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AuthCallbackProps {
  onProfileFetch: (userId: string) => Promise<any>;
}

export const AuthCallback = ({ onProfileFetch }: AuthCallbackProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check for hash tokens and log them for debugging
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        console.log('Hash params present:', !!window.location.hash);
        console.log('Access token present:', !!accessToken);
        console.log('Refresh token present:', !!refreshToken);

        if (accessToken && refreshToken) {
          console.log('Setting session with tokens');
          // Clear URL hash
          window.history.replaceState(null, '', window.location.pathname);

          // Set the session
          const { data: { session }, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (error) {
            console.error('Session error:', error);
            throw error;
          }
          
          if (!session) {
            console.error('No session established');
            throw new Error('No session established');
          }

          console.log('Session established successfully');
          // Fetch user profile
          await onProfileFetch(session.user.id);
          
          toast({
            title: "Success!",
            description: "Successfully authenticated",
          });
          navigate('/', { replace: true });
          return;
        }

        // If no hash tokens, check for existing session
        console.log('Checking existing session');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          throw sessionError;
        }
        
        if (session) {
          console.log('Existing session found');
          await onProfileFetch(session.user.id);
          navigate('/', { replace: true });
        } else {
          console.log('No session found, redirecting to login');
          navigate('/auth/login', { replace: true });
        }
      } catch (error) {
        console.error('Authentication error:', error);
        toast({
          title: "Error",
          description: "Failed to complete authentication",
          variant: "destructive",
        });
        navigate('/auth/login', { replace: true });
      }
    };

    handleCallback();
  }, [navigate, toast, onProfileFetch]);

  // Return a loading state while processing
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-gray-600">Processing authentication...</p>
      </div>
    </div>
  );
};