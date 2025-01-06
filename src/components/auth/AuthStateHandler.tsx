import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AuthStateHandlerProps {
  onProfileFetch: (userId: string) => Promise<any>;
}

export const AuthStateHandler = ({ onProfileFetch }: AuthStateHandlerProps) => {
  const { toast } = useToast();
  
  useEffect(() => {
    const handleHashParams = async () => {
      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
        const params = new URLSearchParams(hash.replace('#', ''));
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
          } else if (session) {
            window.history.replaceState(null, '', window.location.pathname);
            await onProfileFetch(session.user.id);
          }
        }
      }
    };

    handleHashParams();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        onProfileFetch(session.user.id);
      }
    });

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
        }
      } else if (event === "SIGNED_OUT") {
        toast({
          title: "Signed out",
          description: "You have been signed out successfully",
        });
      } else if (event === "USER_UPDATED") {
        toast({
          title: "Email confirmed",
          description: "Your email has been confirmed successfully",
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [onProfileFetch, toast]);

  return null;
};