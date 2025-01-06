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
        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        
        if (session) {
          // Session exists, fetch profile
          const profile = await onProfileFetch(session.user.id);
          
          if (profile) {
            toast({
              title: "Success!",
              description: "Successfully authenticated",
            });
            navigate('/', { replace: true });
          }
        } else {
          // No session, try to get tokens from URL hash
          const hash = window.location.hash;
          if (!hash) {
            navigate('/auth/login', { replace: true });
            return;
          }

          // Parse the hash parameters
          const params = new URLSearchParams(hash.substring(1));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (!accessToken || !refreshToken) {
            throw new Error('Missing authentication tokens');
          }

          // Clear URL hash immediately
          window.history.replaceState(null, '', window.location.pathname);

          // Set the session
          const { data: { session: newSession }, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (error) throw error;
          if (!newSession) throw new Error('No session established');

          // Fetch user profile
          const profile = await onProfileFetch(newSession.user.id);
          
          if (profile) {
            toast({
              title: "Success!",
              description: "Successfully authenticated",
            });
            navigate('/', { replace: true });
          }
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

  return null;
};