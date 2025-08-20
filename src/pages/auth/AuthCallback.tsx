import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { updateUserData } = useAuth();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error("[AuthCallback] Session error:", error);
            navigate("/auth/login");
            return;
          }

          // Fetch user data and update AuthContext
          await updateUserData();

          // Navigate to dashboard after successful session and user data update
          // Navigating to dashboard
          navigate("/dashboard");
        } else {
          // No access or refresh token found in hash
          navigate("/auth/login");
        }
      } catch (error) {
        console.error("[AuthCallback] Authentication error:", error);
        navigate("/auth/login");
      }
    };

    handleAuthCallback();
  }, [navigate, updateUserData]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-600">Processing authentication...</p>
      </div>
    </div>
  );
};

export default AuthCallback;