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
import { useEmployerContext } from "@/hooks/useEmployerContext";
import { useAuth } from "@/lib/auth/AuthContext";
import { cn } from "@/lib/utils";

export function EmployerContextSelector() {
  const { userData } = useAuth();
  const {
    selectedEmployerId,
    employers,
    isLoadingEmployers,
    setContext
  } = useEmployerContext();

  const handleEmployerChange = (id: number | null) => {
    setContext(id);
  };

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
        <Badge variant="secondary" className="ml-2 text-xs">
          Your Company
        </Badge>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select
        value={selectedEmployerId?.toString() || (isSuperAdmin ? "all" : "")}
        onValueChange={(value) => {
          if (value === "all") {
            handleEmployerChange(null);
          } else {
            handleEmployerChange(parseInt(value));
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
              <div className="flex items-center justify-between w-full">
                <span className="flex items-center gap-2">
                  {selectedEmployerId === null && (
                    <Check className="h-4 w-4 text-primary absolute left-2" />
                  )}
                  📊 View All Companies
                </span>
                <Badge variant="outline" className="text-xs h-5 ml-2">
                  All Data
                </Badge>
              </div>
            </SelectItem>
          )}
          {isSuperAdmin && (
            <div className="my-1 border-t" />
          )}
          {availableEmployers.map((employer) => {
            const isSelected = employer.employer_id === selectedEmployerId;
            const isUserDefault = employer.employer_id === userEmployerId;
            
            return (
              <SelectItem
                key={employer.employer_id}
                value={employer.employer_id.toString()}
                className={cn(
                  "relative pl-8",
                  isUserDefault && "font-medium"
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="flex items-center gap-2">
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary absolute left-2" />
                    )}
                    {employer.employer_name}
                  </span>
                  <div className="flex items-center gap-1 ml-2">
                    {isUserDefault && (
                      <Badge variant="outline" className="text-xs h-5">
                        Default
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-xs h-5">
                      ID: {employer.employer_id}
                    </Badge>
                  </div>
                </div>
              </SelectItem>
            );
          })}
          {availableEmployers.length === 0 && !isLoadingEmployers && (
            <div className="px-2 py-4 text-sm text-muted-foreground text-center">
              No employers available
            </div>
          )}
          {isLoadingEmployers && (
            <div className="px-2 py-4 text-sm text-muted-foreground text-center">
              Loading employers...
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
