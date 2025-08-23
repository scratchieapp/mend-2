import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type UserMode = "mend" | "builder" | "medical";

export function useUserMode() {
  const navigate = useNavigate();
  const [currentMode, setCurrentMode] = useState<UserMode>(() => {
    const storedMode = localStorage.getItem("userMode");
    return (storedMode as UserMode) || "mend";
  });

  const handleModeChange = async (mode: UserMode) => {
    try {
      // First update local state and storage
      setCurrentMode(mode);
      localStorage.setItem("userMode", mode);
      
      // Then handle navigation and context
      if (mode === "mend") {
        await supabase.rpc('set_employer_context', {
          employer_id: null
        });
        navigate("/");
      } else if (mode === "builder") {
        navigate("/builder"); // Navigate directly to the builder dashboard
      } else if (mode === "medical") {
        navigate("/medical");
      }
    } catch (error) {
      console.error('Error in handleModeChange:', error);
    }
  };

  return { currentMode, handleModeChange };
}