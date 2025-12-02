import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SiteHoursList } from "@/components/builder/hours-management/SiteHoursList";
import { SiteHoursSearch } from "@/components/builder/hours-management/SiteHoursSearch";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, startOfMonth, addMonths } from "date-fns";
import { Site, MonthlyHours } from "@/components/builder/hours-management/types";
import { useEmployerContext } from "@/hooks/useEmployerContext";
import { useAuth } from "@/lib/auth/AuthContext";

const HoursManagementPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [hoursData, setHoursData] = useState<MonthlyHours>({});
  // Track the "end month" for pagination - start at last completed month (1 month ago)
  const [monthOffset, setMonthOffset] = useState(1);
  
  // Get employer ID from context (handles roles 5,6,7 correctly)
  const { userData, isLoading: isAuthLoading } = useAuth();
  const { selectedEmployerId: contextEmployerId } = useEmployerContext();
  
  // Ensure employer_id is parsed as a number
  const userEmployerId = userData?.employer_id ? Number(userData.employer_id) : null;
  const selectedEmployerId = contextEmployerId || userEmployerId;

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

  // Show message if no employer context available
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