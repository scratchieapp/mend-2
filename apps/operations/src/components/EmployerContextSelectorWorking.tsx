import { useEffect } from "react";
import { Building2 } from "lucide-react";
import { useEmployerSelection } from "@/hooks/useEmployerSelection";
import { useAuth } from "@/lib/auth/AuthContext";
import { Badge } from "@/components/ui/badge";

export function EmployerContextSelector() {
  const { userData } = useAuth();
  const {
    selectedEmployerId,
    employers,
    isLoadingEmployers,
    handleEmployerChange,
  } = useEmployerSelection();

  const isSuperAdmin = userData?.role_id === 1;

  // Set default employer for non-super admins
  useEffect(() => {
    if (userData && !selectedEmployerId) {
      // If user is not a super admin and has an employer, auto-select it
      if (userData.role_id !== 1 && userData.employer_id) {
        const defaultEmployerId = parseInt(userData.employer_id);
        handleEmployerChange(defaultEmployerId);
      }
    }
  }, [userData, selectedEmployerId, handleEmployerChange]);

  // Don't show selector if user has only one employer option
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
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <select
        value={selectedEmployerId?.toString() || (isSuperAdmin ? "all" : "")}
        onChange={(e) => {
          const value = e.target.value;
          if (value === "all") {
            handleEmployerChange(null);
          } else {
            const id = parseInt(value);
            if (!isNaN(id)) {
              handleEmployerChange(id);
            }
          }
        }}
        className="w-[280px] px-3 py-2 border border-input bg-background rounded-md text-sm
                   focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
                   disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isLoadingEmployers}
      >
        {isSuperAdmin && (
          <option value="all">📊 View All Companies ({employers.length})</option>
        )}
        {employers.map((employer) => (
          <option key={employer.employer_id} value={employer.employer_id}>
            {employer.employer_name}
            {employer.employer_id === selectedEmployerId && " ✓"}
          </option>
        ))}
      </select>
      {isSuperAdmin && (
        <Badge variant="default" className="ml-2">
          Super Admin
        </Badge>
      )}
    </div>
  );
}
