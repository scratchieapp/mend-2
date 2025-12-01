import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SiteHoursList } from "@/components/builder/hours-management/SiteHoursList";
import { SiteHoursSearch } from "@/components/builder/hours-management/SiteHoursSearch";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, startOfMonth } from "date-fns";
import { Site, MonthlyHours } from "@/components/builder/hours-management/types";
import { useEmployerContext } from "@/hooks/useEmployerContext";
import { useAuth } from "@/lib/auth/AuthContext";

const HoursManagementPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [hoursData, setHoursData] = useState<MonthlyHours>({});
  
  // Get employer ID from context (handles roles 5,6,7 correctly)
  const { userData } = useAuth();
  const { selectedEmployerId: contextEmployerId } = useEmployerContext();
  const selectedEmployerId = contextEmployerId || userData?.employer_id;

  // Get the last 3 months
  const months = Array.from({ length: 3 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return format(startOfMonth(date), 'yyyy-MM');
  }).reverse();

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

  // Show loading while waiting for auth/employer context
  if (!selectedEmployerId) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
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

      <div className="mt-8 space-y-4">
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