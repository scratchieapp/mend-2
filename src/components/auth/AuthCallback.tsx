import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AuthCallbackProps {
  onProfileFetch?: (userId: string) => Promise<any>;
}

export const AuthCallback = ({ onProfileFetch }: AuthCallbackProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('AuthCallback: Component mounted');
        console.log('Full URL:', window.location.href);
        console.log('Hash:', window.location.hash);
        
        // Check for hash tokens first
        if (window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          
          console.log('Parsed tokens - Access:', !!accessToken, 'Refresh:', !!refreshToken);

          if (accessToken && refreshToken) {
            try {
              console.log('Setting session with tokens');
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

              console.log('Session established:', session.user.id);
              if (onProfileFetch) {
                await onProfileFetch(session.user.id);
              }
              
              // Clear hash and navigate
              window.history.replaceState(null, '', window.location.pathname);
              navigate('/roles/public', { replace: true });
              
              toast({
                title: "Success!",
                description: "Successfully authenticated",
              });
              return;
            } catch (error) {
              console.error('Auth error:', error);
              throw error;
            }
          }
        }

        // If no hash tokens, check existing session
        console.log('Checking existing session');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          console.log('Existing session found:', session.user.id);
          if (onProfileFetch) {
            await onProfileFetch(session.user.id);
          }
          navigate('/roles/public', { replace: true });
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-600">Processing authentication...</p>
      </div>
    </div>
  );
};