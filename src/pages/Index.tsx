import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth/login");
        return;
      }

      // Check if email is confirmed
      if (!session.user.email_confirmed_at) {
        navigate("/auth/confirmation-pending");
        return;
      }

      // If email is confirmed, proceed with normal flow
      const { data: profile } = await supabase
        .from('users')
        .select('*, user_roles!inner(*)')
        .eq('user_id', session.user.id)
        .single();

      if (profile?.role_id) {
        const roleRoutes: { [key: number]: string } = {
          1: '/roles/mend-super-admin',
          2: '/roles/mend-account-manager',
          3: '/roles/mend-data-entry',
          4: '/roles/mend-analyst',
          5: '/roles/builder-admin',
          6: '/roles/site-admin',
          9: '/roles/public'
        };

        const route = roleRoutes[profile.role_id];
        if (route) {
          navigate(route);
        }
      }
    };
    
    checkUser();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to Your App</h1>
        <p className="text-xl text-gray-600 mb-8">You are logged in!</p>
        <Button onClick={handleSignOut}>Sign Out</Button>
      </div>
    </div>
  );
};

export default Index;