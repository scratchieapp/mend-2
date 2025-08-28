import { useEffect } from "react";
import { Building2, ChevronDown, Check } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useEmployerSelection } from "@/hooks/useEmployerSelection";
import { useAuth } from "@/lib/auth/AuthContext";
import { cn } from "@/lib/utils";

export function EmployerContextSelector() {
  const { userData } = useAuth();
  const {
    selectedEmployerId,
    employers,
    isLoadingEmployers,
    handleEmployerChange,
  } = useEmployerSelection();

  // Debug logging
  console.log('EmployerContextSelector state:', {
    selectedEmployerId,
    employers: employers.length,
    userData: userData?.role_id,
    isLoadingEmployers
  });

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

  // Non-super admins shouldn't see the selector if they only have one employer
  const isSuperAdmin = userData?.role_id === 1;
  const userEmployerId = userData?.employer_id ? parseInt(userData.employer_id) : null;
  
  // Filter employers based on user role
  const availableEmployers = isSuperAdmin 
    ? employers 
    : employers.filter(e => e.employer_id === userEmployerId);

  // Don't show selector if user has only one employer option
  if (!isSuperAdmin && availableEmployers.length <= 1 && selectedEmployerId) {
    const selectedEmployer = employers.find(e => e.employer_id === selectedEmployerId);
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{selectedEmployer?.employer_name || 'Loading...'}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select
        value={selectedEmployerId?.toString() || (isSuperAdmin ? "all" : "")}
        onValueChange={(value) => {
          console.log('=== SELECT CHANGE DEBUG ===');
          console.log('Raw value from Select:', value);
          console.log('Type of value:', typeof value);
          console.log('Value === "all":', value === "all");
          
          if (value === "all") {
            console.log('Calling handleEmployerChange(null) for View All');
            handleEmployerChange(null);
          } else {
            const employerId = parseInt(value);
            console.log('Parsed employer ID:', employerId);
            console.log('Is NaN?:', isNaN(employerId));
            
            if (isNaN(employerId)) {
              console.error('Failed to parse employer ID from value:', value);
            } else {
              console.log('Calling handleEmployerChange with employer ID:', employerId);
              handleEmployerChange(employerId);
            }
          }
        }}
        disabled={isLoadingEmployers}
      >
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder="Select an employer...">
            {selectedEmployerId === null && isSuperAdmin 
              ? "📊 View All Companies" 
              : undefined}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
            {isSuperAdmin ? "Company Filter" : "Your Company"}
          </div>
          {isSuperAdmin && (
            <SelectItem
              value="all"
              className={cn(
                "relative pl-8 font-medium",
                selectedEmployerId === null && "bg-primary/5"
              )}
            >
              <Check 
                className={cn(
                  "absolute left-2 h-4 w-4",
                  selectedEmployerId === null ? "opacity-100" : "opacity-0"
                )}
              />
              <div className="flex items-center gap-2">
                <span>📊 View All Companies</span>
                <Badge variant="secondary" className="ml-auto text-xs">
                  {employers.length}
                </Badge>
              </div>
            </SelectItem>
          )}
          <div className="border-t">
            {availableEmployers.map((employer) => {
              console.log('Rendering employer option:', {
                id: employer.employer_id,
                name: employer.employer_name,
                valueString: employer.employer_id.toString()
              });
              
              return (
                <SelectItem
                  key={employer.employer_id}
                  value={employer.employer_id.toString()}
                  className={cn(
                    "relative pl-8",
                    selectedEmployerId === employer.employer_id && "bg-primary/5"
                  )}
                >
                  <Check 
                    className={cn(
                      "absolute left-2 h-4 w-4",
                      selectedEmployerId === employer.employer_id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex items-center justify-between">
                    <span>{employer.employer_name}</span>
                    {employer.employer_id === userEmployerId && !isSuperAdmin && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Your Company
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              );
            })}
          </div>
        </SelectContent>
      </Select>
      {isLoadingEmployers && (
        <div className="text-xs text-muted-foreground animate-pulse">
          Loading companies...
        </div>
      )}
    </div>
  );
}
