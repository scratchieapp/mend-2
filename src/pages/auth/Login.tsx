import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const roleRoutes: { [key: number]: string } = {
  1: '/roles/mend-super-admin',
  2: '/roles/mend-account-manager',
  3: '/roles/mend-data-entry',
  4: '/roles/mend-analyst',
  5: '/roles/builder-admin',
  6: '/roles/site-admin',
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
    // Handle hash fragment from email confirmation
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
            // Clear the hash without triggering a reload
            window.history.replaceState(null, '', window.location.pathname);
            await fetchUserProfile(session.user.id);
          }
        }
      }
    };

    handleHashParams();

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
              magicLink={false}
              showLinks={true}
              localization={{
                variables: {
                  sign_in: {
                    email_label: 'Email',
                    password_label: 'Password',
                    button_label: 'Sign in',
                    loading_button_label: 'Signing in...',
                    password_input_placeholder: 'Your password',
                    email_input_placeholder: 'Your email',
                    link_text: 'Already have an account? Sign in',
                  },
                  sign_up: {
                    email_label: 'Email',
                    password_label: 'Password',
                    button_label: 'Sign up',
                    loading_button_label: 'Signing up...',
                    password_input_placeholder: 'Your password',
                    email_input_placeholder: 'Your email',
                    link_text: 'Don\'t have an account? Sign up',
                    confirmation_text: 'Check your email for the confirmation link'
                  },
                  forgotten_password: {
                    email_label: 'Email',
                    button_label: 'Send reset instructions',
                    loading_button_label: 'Sending reset instructions...',
                    link_text: 'Forgot your password?',
                    confirmation_text: 'Check your email for the password reset link'
                  }
                }
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;