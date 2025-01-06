import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SessionManagerProps {
  onProfileFetch: (userId: string) => Promise<any>;
}

export const SessionManager = ({ onProfileFetch }: SessionManagerProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && location.pathname === '/auth/login') {
        navigate('/', { replace: true });
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
          navigate('/', { replace: true });
        }
      } else if (event === "SIGNED_OUT") {
        toast({
          title: "Signed out",
          description: "You have been signed out successfully",
        });
        navigate('/auth/login', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname, toast, onProfileFetch]);

  return null;
};