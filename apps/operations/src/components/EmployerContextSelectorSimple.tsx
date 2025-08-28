import { useEffect } from "react";
import { Building2 } from "lucide-react";
import { useEmployerSelection } from "@/hooks/useEmployerSelection";
import { useAuth } from "@/lib/auth/AuthContext";

export function EmployerContextSelector() {
  const { userData } = useAuth();
  const {
    selectedEmployerId,
    employers,
    isLoadingEmployers,
    handleEmployerChange,
  } = useEmployerSelection();

  // Removed console.log to prevent spam in production

  const isSuperAdmin = userData?.role_id === 1;

  if (isLoadingEmployers) {
    return <div>Loading employers...</div>;
  }

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <select
        value={selectedEmployerId?.toString() || (isSuperAdmin ? "all" : "")}
        onChange={(e) => {
          const value = e.target.value;
          // console.log('Native select onChange:', value);
          
          if (value === "all") {
            // console.log('Calling handleEmployerChange(null)');
            handleEmployerChange(null);
          } else {
            const id = parseInt(value);
            // console.log('Calling handleEmployerChange with:', id);
            handleEmployerChange(id);
          }
        }}
        className="w-[280px] px-3 py-2 border rounded-md"
        disabled={isLoadingEmployers}
      >
        {isSuperAdmin && (
          <option value="all">📊 View All Companies ({employers.length})</option>
        )}
        {employers.map((employer) => (
          <option key={employer.employer_id} value={employer.employer_id}>
            {employer.employer_name}
          </option>
        ))}
      </select>
    </div>
  );
}
