import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AuthStateHandlerProps {
  onProfileFetch: (userId: string) => Promise<any>;
}

export const AuthStateHandler = ({ onProfileFetch }: AuthStateHandlerProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  useEffect(() => {
    const handleHashParams = async () => {
      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
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
            } else if (session) {
              // Clear the URL hash
              window.history.replaceState(null, '', window.location.pathname);
              
              // Fetch user profile and handle redirection
              const profile = await onProfileFetch(session.user.id);
              if (profile) {
                toast({
                  title: "Success!",
                  description: "Successfully authenticated",
                });
                navigate('/');
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

    // Handle initial hash params (email confirmation flow)
    handleHashParams();

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        onProfileFetch(session.user.id);
      }
    });

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
      } else if (event === "USER_UPDATED") {
        toast({
          title: "Profile updated",
          description: "Your profile has been updated successfully",
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [onProfileFetch, toast, navigate]);

  return null;
};