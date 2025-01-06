import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AuthCard } from "@/components/auth/AuthCard";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN") {
        navigate("/");
        toast({
          title: "Success",
          description: "Successfully signed in",
        });
      } else if (event === "SIGNED_OUT") {
        const { error } = await supabase.auth.getSession();
        if (error) {
          console.error('Auth error:', error);
          
          // Handle rate limit error
          if (error.message?.includes('429') || error.message?.includes('rate_limit')) {
            setError("Too many attempts. Please wait a few minutes before trying again.");
            toast({
              title: "Rate Limit Exceeded",
              description: "Please wait a few minutes before trying again",
              variant: "destructive",
            });
            return;
          }

          // Handle other errors
          setError("An error occurred. Please try again.");
        }
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <AuthCard
          title="Welcome"
          description="Sign in to your account or create a new one"
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