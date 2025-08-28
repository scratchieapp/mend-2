import { ModeSelector } from "./navigation/ModeSelector";
import { NavigationLinks } from "./navigation/NavigationLinks";
import { EmployerSelector } from "./builder/EmployerSelector";
// Temporarily use simple version to diagnose issue
import { EmployerContextSelector } from "./EmployerContextSelectorSimple";
import { UserBadge } from "./auth/UserBadge";
import { useUserMode } from "@/hooks/useUserMode";
import { useEmployerSelection } from "@/hooks/useEmployerSelection";
import { useAuth } from "@/lib/auth/AuthContext";

export function MenuBar() {
  const { currentMode, handleModeChange } = useUserMode();
  const { userData } = useAuth();
  const { 
    selectedEmployerId, 
    employers, 
    isLoadingEmployers, 
    handleEmployerChange 
  } = useEmployerSelection();

  const isSuperAdmin = userData?.role_id === 1;
  const showEmployerSelector = currentMode === "builder";
  const showContextSelector = currentMode === "mend" && isSuperAdmin;

  return (
    <nav className="border-b bg-white shadow-sm">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <ModeSelector 
            currentMode={currentMode} 
            onModeChange={handleModeChange} 
          />
          {showEmployerSelector && (
            <EmployerSelector
              employers={employers}
              selectedEmployerId={selectedEmployerId}
              onSelect={handleEmployerChange}
              isLoading={isLoadingEmployers}
            />
          )}
          {showContextSelector && (
            <EmployerContextSelector />
          )}
          <NavigationLinks currentMode={currentMode} />
        </div>
        <UserBadge />
      </div>
    </nav>
  );
}