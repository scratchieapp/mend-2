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
        console.log('AuthCallback: Component mounted');
        console.log('Current URL:', window.location.href);
        console.log('Hash:', window.location.hash);
        
        // Check for hash tokens
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');
        
        console.log('Auth type:', type);
        console.log('Access token present:', !!accessToken);
        console.log('Refresh token present:', !!refreshToken);

        if (accessToken && refreshToken) {
          console.log('AuthCallback: Setting session with tokens');
          
          // Clear URL hash
          window.history.replaceState(null, '', window.location.pathname);

          try {
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

            console.log('Session established successfully:', session.user.id);
            
            // Fetch user profile
            const profile = await onProfileFetch(session.user.id);
            console.log('Profile fetched:', profile);
            
            toast({
              title: "Success!",
              description: "Successfully authenticated",
            });
            
            navigate('/', { replace: true });
            return;
          } catch (sessionError) {
            console.error('Error setting session:', sessionError);
            throw sessionError;
          }
        }

        // If no hash tokens, check for existing session
        console.log('Checking existing session');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          throw sessionError;
        }
        
        if (session) {
          console.log('Existing session found:', session.user.id);
          const profile = await onProfileFetch(session.user.id);
          console.log('Profile fetched:', profile);
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

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-gray-600">Processing authentication...</p>
      </div>
    </div>
  );
};