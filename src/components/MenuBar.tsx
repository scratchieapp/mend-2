import { ModeSelector } from "./navigation/ModeSelector";
import { NavigationLinks } from "./navigation/NavigationLinks";
import { EmployerSelector } from "./builder/EmployerSelector";
import { UserBadge } from "./auth/UserBadge";
import { useUserMode } from "@/hooks/useUserMode";
import { useEmployerSelection } from "@/hooks/useEmployerSelection";

export function MenuBar() {
  const { currentMode, handleModeChange } = useUserMode();
  const { 
    selectedEmployerId, 
    employers, 
    isLoadingEmployers, 
    handleEmployerChange 
  } = useEmployerSelection();

  const showEmployerSelector = currentMode === "builder";

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
          <NavigationLinks currentMode={currentMode} />
        </div>
        <UserBadge />
      </div>
    </nav>
  );
}