import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ConfirmationPending = () => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg text-center">
        <Mail className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h1>
        <p className="text-gray-600 mb-6">
          We've sent you a confirmation email. Please check your inbox and click the confirmation link to activate your account.
        </p>
        <div className="space-y-4">
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="w-full"
          >
            Back to Login
          </Button>
          <p className="text-sm text-gray-500">
            Didn't receive the email? Check your spam folder or try signing in again.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationPending;