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
        
        // Check for hash tokens first
        const hash = window.location.hash;
        console.log('Hash:', hash);
        
        if (hash) {
          // Remove the # from the hash string
          const hashParams = new URLSearchParams(hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          
          console.log('Access token present:', !!accessToken);
          console.log('Refresh token present:', !!refreshToken);

          if (accessToken && refreshToken) {
            console.log('Setting session with tokens');
            
            try {
              const { data: { session }, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
              });

              if (error) throw error;
              if (!session) throw new Error('No session established');

              console.log('Session established successfully:', session.user.id);
              
              const profile = await onProfileFetch(session.user.id);
              console.log('Profile fetched:', profile);
              
              // Clear hash from URL
              window.history.replaceState(null, '', window.location.pathname);
              
              toast({
                title: "Success!",
                description: "Successfully authenticated",
              });
              
              navigate('/roles/public', { replace: true });
              return;
            } catch (error) {
              console.error('Session error:', error);
              throw error;
            }
          }
        }

        // If no hash tokens or they're invalid, check for existing session
        console.log('Checking existing session');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          console.log('Existing session found:', session.user.id);
          const profile = await onProfileFetch(session.user.id);
          console.log('Profile fetched:', profile);
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