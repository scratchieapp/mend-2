import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

// Update roleRoutes to match the actual role IDs from the database
const roleRoutes: { [key: number]: string } = {
  1: '/roles/admin', // mend_super_admin
  2: '/roles/manager', // mend_account_manager
  3: '/roles/supervisor',
  4: '/roles/employee',
  5: '/roles/contractor',
  6: '/roles/client',
  7: '/roles/vendor',
  8: '/roles/guest',
  9: '/roles/public'
};

const Login = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [roleId, setRoleId] = useState<number | null>(null);

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log("Fetching profile for user:", userId);
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*, user_roles!inner(*)')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        toast({
          title: "Error",
          description: "Failed to fetch user profile",
          variant: "destructive",
        });
        return null;
      }

      console.log("Fetched profile:", profile);
      if (profile?.role_id) {
        setRoleId(profile.role_id);
        const route = roleRoutes[profile.role_id];
        if (route) {
          navigate(route);
        }
      }
      return profile;
    } catch (err) {
      console.error('Error:', err);
      return null;
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchUserProfile(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session);
      if (event === "SIGNED_IN" && session) {
        const profile = await fetchUserProfile(session.user.id);
        
        if (profile) {
          toast({
            title: "Welcome back!",
            description: `Logged in as ${profile.display_name || session.user.email}`,
          });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Welcome back</CardTitle>
            <CardDescription className="text-center">
              Sign in to your account
              {roleId && (
                <div className="mt-2 text-sm font-medium text-blue-600">
                  Your role ID: {roleId}
                </div>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-4 text-sm text-red-800 bg-red-100 rounded">
                {error}
              </div>
            )}
            <Auth
              supabaseClient={supabase}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: '#000000',
                      brandAccent: '#333333',
                    },
                  },
                },
              }}
              providers={[]}
              redirectTo={window.location.origin}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;