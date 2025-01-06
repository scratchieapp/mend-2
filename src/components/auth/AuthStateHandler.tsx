import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AuthStateHandlerProps {
  onProfileFetch: (userId: string) => Promise<any>;
}

export const AuthStateHandler = ({ onProfileFetch }: AuthStateHandlerProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  useEffect(() => {
    const handleAuthRedirect = async () => {
      // Get the hash from the URL
      const hash = window.location.hash;
      
      if (hash) {
        try {
          // Remove the # from the hash string
          const params = new URLSearchParams(hash.substring(1));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          
          if (accessToken && refreshToken) {
            const { data: { session }, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
            
            if (error) {
              console.error('Error setting session:', error);
              toast({
                title: "Error",
                description: "Failed to authenticate",
                variant: "destructive",
              });
              navigate('/auth/login');
              return;
            }
            
            if (session) {
              // Clear the URL hash
              window.history.replaceState(null, '', window.location.pathname);
              
              try {
                // Fetch user profile
                const profile = await onProfileFetch(session.user.id);
                if (profile) {
                  toast({
                    title: "Success!",
                    description: "Successfully authenticated",
                  });
                  navigate('/');
                }
              } catch (profileError) {
                console.error('Error fetching profile:', profileError);
                toast({
                  title: "Error",
                  description: "Failed to fetch user profile",
                  variant: "destructive",
                });
                navigate('/auth/login');
              }
            }
          }
        } catch (error) {
          console.error('Error handling auth redirect:', error);
          toast({
            title: "Error",
            description: "Failed to process authentication",
            variant: "destructive",
          });
          navigate('/auth/login');
        }
      }
    };

    // Handle initial auth redirect
    handleAuthRedirect();

    // Check for existing session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && location.pathname === '/auth/login') {
        navigate('/');
      }
    };
    checkSession();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        const profile = await onProfileFetch(session.user.id);
        if (profile) {
          toast({
            title: "Welcome!",
            description: `Logged in as ${profile.display_name || session.user.email}`,
          });
          navigate('/');
        }
      } else if (event === "SIGNED_OUT") {
        toast({
          title: "Signed out",
          description: "You have been signed out successfully",
        });
        navigate('/auth/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [onProfileFetch, toast, navigate, location]);

  return null;
};