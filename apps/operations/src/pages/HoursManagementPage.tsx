import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar, Building2, ArrowLeft } from "lucide-react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { SiteHoursList } from "@/components/builder/hours-management/SiteHoursList";
import { SiteHoursSearch } from "@/components/builder/hours-management/SiteHoursSearch";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, startOfMonth, addMonths } from "date-fns";
import { Site, MonthlyHours } from "@/components/builder/hours-management/types";
import { useEmployerContext } from "@/hooks/useEmployerContext";
import { useAuth } from "@/lib/auth/AuthContext";
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select";
import { Badge } from "@/components/ui/badge";

const HoursManagementPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [hoursData, setHoursData] = useState<MonthlyHours>({});
  // Track the "end month" for pagination - start at last completed month (1 month ago)
  const [monthOffset, setMonthOffset] = useState(1);
  
  // Get employer ID from context (handles roles 5,6,7 correctly)
  const { userData, isLoading: isAuthLoading } = useAuth();
  const { selectedEmployerId: contextEmployerId } = useEmployerContext();
  
  // Check if user is Mend staff (roles 1-4)
  const userRoleId = userData?.role_id ? parseInt(userData.role_id) : null;
  const isMendUser = !!(userRoleId && userRoleId >= 1 && userRoleId <= 4);
  
  // For Mend staff: get employer from URL query param, or allow selection
  const urlEmployerId = searchParams.get('employer');
  const [localSelectedEmployerId, setLocalSelectedEmployerId] = useState<string>(urlEmployerId || "");
  
  // Fetch all employers for Mend staff dropdown
  const { data: allEmployers = [], isLoading: isLoadingEmployers } = useQuery({
    queryKey: ['all-employers-for-hours'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employers')
        .select('employer_id, employer_name')
        .order('employer_name');
      
      if (error) throw error;
      return data;
    },
    enabled: isMendUser,
  });

  // Convert employers to searchable options
  const employerOptions: SearchableSelectOption[] = useMemo(() => {
    return allEmployers.map(emp => ({
      value: emp.employer_id.toString(),
      label: emp.employer_name,
    }));
  }, [allEmployers]);

  // Handle employer change for Mend staff
  const handleEmployerChange = (value: string) => {
    setLocalSelectedEmployerId(value);
    // Update URL param
    if (value) {
      setSearchParams({ employer: value });
    } else {
      setSearchParams({});
    }
    // Reset hours data when employer changes
    setHoursData({});
  };
  
  // Ensure employer_id is parsed as a number
  const userEmployerId = userData?.employer_id ? Number(userData.employer_id) : null;
  
  // Effective employer ID: Mend staff uses local selection, others use context/userData
  const selectedEmployerId = isMendUser 
    ? (localSelectedEmployerId ? parseInt(localSelectedEmployerId) : null)
    : (contextEmployerId || userEmployerId);
  
  // Get employer name for display
  const selectedEmployer = allEmployers.find(e => e.employer_id === selectedEmployerId);

  // Get 3 completed months based on offset (excludes current incomplete month)
  // monthOffset=1 means: last month, 2 months ago, 3 months ago
  // monthOffset=4 means: 4 months ago, 5 months ago, 6 months ago
  const months = Array.from({ length: 3 }, (_, i) => {
    const date = subMonths(new Date(), monthOffset + i);
    return format(startOfMonth(date), 'yyyy-MM');
  }).reverse();
  
  // Check if we can go to more recent months (but not current month)
  const canGoNewer = monthOffset > 1;
  // Allow going back up to 24 months
  const canGoOlder = monthOffset < 22;
  
  const handleGoNewer = () => {
    if (canGoNewer) setMonthOffset(monthOffset - 3);
  };
  
  const handleGoOlder = () => {
    if (canGoOlder) setMonthOffset(monthOffset + 3);
  };

  const { data: sites = [], isLoading: isLoadingSites } = useQuery({
    queryKey: ['sites', selectedEmployerId],
    queryFn: async () => {
      if (!selectedEmployerId) return [];
      const { data, error } = await supabase
        .from('sites')
        .select('site_id, site_name, project_type, city, state, supervisor_name, supervisor_telephone')
        .eq('employer_id', selectedEmployerId)
        .order('site_name');
      
      if (error) throw error;
      return data as Site[];
    },
    enabled: !!selectedEmployerId,
  });

  const { isLoading: isLoadingHours } = useQuery({
    queryKey: ['hours-worked', months, selectedEmployerId],
    queryFn: async () => {
      const startDate = months[0];
      const endDate = months[months.length - 1];
      
      const { data, error } = await supabase
        .from('hours_worked')
        .select('*')
        .eq('employer_id', selectedEmployerId)
        .gte('month', `${startDate}-01`)
        .lte('month', `${endDate}-01`);
      
      if (error) throw error;

      // Initialize hoursData state with existing data
      const initialHoursData: MonthlyHours = {};
      months.forEach(month => {
        initialHoursData[month] = {};
        sites.forEach(site => {
          const siteHours = data?.find(h => 
            h.site_id === site.site_id && 
            format(new Date(h.month), 'yyyy-MM') === month
          );
          
          initialHoursData[month][site.site_id] = {
            employer_hours: siteHours?.employer_hours?.toString() || '',
            subcontractor_hours: siteHours?.subcontractor_hours?.toString() || '',
          };
        });
      });
      
      setHoursData(initialHoursData);
      return data;
    },
    enabled: sites.length > 0,
  });

  // Show loading while waiting for auth
  if (isAuthLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Show employer selection for Mend staff if no employer selected
  if (isMendUser && !selectedEmployerId) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Hours Worked Management</h1>
        </div>
        
        <div className="max-w-md mx-auto space-y-4">
          <p className="text-muted-foreground text-center">
            Select an employer to manage their hours worked data.
          </p>
          
          <SearchableSelect
            options={employerOptions}
            value={localSelectedEmployerId}
            onValueChange={handleEmployerChange}
            placeholder="Search for a company..."
            searchPlaceholder="Type to search companies..."
            emptyMessage="No company found."
            icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
          />
          
          <div className="text-center pt-4">
            <Link to="/hours-compliance" className="text-sm text-muted-foreground hover:text-primary">
              ← Back to Hours Compliance Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show message if no employer context available (non-Mend staff)
  if (!selectedEmployerId) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Hours Worked Management</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">No employer context available.</p>
          <p className="text-sm text-muted-foreground mt-2">Please ensure you are assigned to an employer.</p>
        </div>
      </div>
    );
  }

  if (isLoadingSites || isLoadingHours) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Format month range for display
  const monthRangeDisplay = `${format(new Date(months[0] + '-01'), 'MMM yyyy')} - ${format(new Date(months[2] + '-01'), 'MMM yyyy')}`;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Hours Worked Management</h1>
            {isMendUser && selectedEmployer && (
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  <Building2 className="h-3 w-3 mr-1" />
                  {selectedEmployer.employer_name}
                </Badge>
                <Button
                  variant="link"
                  size="sm"
                  className="text-xs p-0 h-auto"
                  onClick={() => {
                    setLocalSelectedEmployerId("");
                    setSearchParams({});
                    setHoursData({});
                  }}
                >
                  Change
                </Button>
              </div>
            )}
          </div>
        </div>
        {isMendUser && (
          <Link to="/hours-compliance" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" />
            Compliance Dashboard
          </Link>
        )}
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between bg-slate-50 rounded-lg p-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleGoOlder}
          disabled={!canGoOlder}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Older Months
        </Button>
        
        <div className="flex items-center gap-2 text-sm font-medium">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>{monthRangeDisplay}</span>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleGoNewer}
          disabled={!canGoNewer}
          className="gap-2"
        >
          Newer Months
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <p className="text-sm text-muted-foreground text-center">
        Note: You can only enter hours for completed months. The current month ({format(new Date(), 'MMMM yyyy')}) is not available until it ends.
      </p>

      <div className="mt-4 space-y-4">
        <SiteHoursSearch
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        <SiteHoursList
          sites={sites}
          months={months}
          hoursData={hoursData}
          setHoursData={setHoursData}
          filteredSites={sites.filter(site =>
            site.site_name.toLowerCase().includes(searchQuery.toLowerCase())
          )}
        />
      </div>
    </div>
  );
};

export default HoursManagementPage;