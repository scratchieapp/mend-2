import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // AuthCallback: Component mounted
        // Full URL, Hash, and Pathname being processed
        
        // Check for hash tokens first
        if (window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          
          // Parsed tokens from hash

          if (accessToken && refreshToken) {
            try {
              // Setting session with tokens
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

              // Session established successfully
              
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
        // Checking existing session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // Existing session found
          navigate('/roles/public', { replace: true });
        } else {
          // No session found, redirecting to login
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
  }, [navigate, toast]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-600">Processing authentication...</p>
      </div>
    </div>
  );
};