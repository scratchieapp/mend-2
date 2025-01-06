import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthStateHandler } from "@/components/auth/AuthStateHandler";

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
  const [roleId, setRoleId] = useState<number | null>(null);
  const { toast } = useToast();

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

  // Custom error handler for auth errors
  const handleAuthError = (error: any) => {
    console.error('Auth error:', error);
    
    // Handle rate limit error
    if (error.message?.includes('429') || error.body?.includes('rate_limit')) {
      setError("Too many attempts. Please wait a few minutes before trying again.");
      toast({
        title: "Rate Limit Exceeded",
        description: "Please wait a few minutes before trying again",
        variant: "destructive",
      });
      return;
    }

    // Handle other common errors
    if (error.message?.includes('body stream already read')) {
      // Ignore this error as it's harmless
      return;
    }

    setError("An error occurred. Please try again.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <AuthStateHandler onProfileFetch={fetchUserProfile} />
        <AuthCard
          title="Welcome"
          description="Sign in to your account or create a new one"
          roleId={roleId}
        >
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
            onError={handleAuthError}
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
                  password_label: 'Create Password',
                  button_label: 'Create Account',
                  loading_button_label: 'Creating account...',
                  password_input_placeholder: 'Choose a password',
                  email_input_placeholder: 'Your email',
                  link_text: 'Need an account? Sign up',
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
        </AuthCard>
      </div>
    </div>
  );
};

export default Login;