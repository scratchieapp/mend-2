import { Building2 } from "lucide-react";
import { useEmployerContext } from "@/hooks/useEmployerContext";
import { useAuth } from "@/lib/auth/AuthContext";
import { EmployerSelector } from "@/components/builder/EmployerSelector";

export function EmployerContextSelector() {
  const { userData } = useAuth();
  const {
    selectedEmployerId,
    employers,
    isLoadingEmployers,
    setContext,
  } = useEmployerContext();

  const isSuperAdmin = userData?.role_id === 1;

  // Don't show selector if user has only one employer option and is not super admin
  if (!isSuperAdmin && employers.length <= 1 && selectedEmployerId) {
    const selectedEmployer = employers.find(e => e.employer_id === selectedEmployerId);
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{selectedEmployer?.employer_name || 'Loading...'}</span>
      </div>
    );
  }

  if (isLoadingEmployers) {
    return (
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <div className="text-sm text-muted-foreground">Loading employers...</div>
      </div>
    );
  }

  return (
    <EmployerSelector
      employers={employers}
      selectedEmployerId={selectedEmployerId}
      onSelect={(id) => setContext(id)}
      isLoading={isLoadingEmployers}
    />
  );
}
