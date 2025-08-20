import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TimeSeriesChart } from "@/components/builder/TimeSeriesChart";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, startOfMonth } from "date-fns";
import { SiteHoursSearch } from "@/components/builder/hours-management/SiteHoursSearch";
import { SiteHoursList } from "@/components/builder/hours-management/SiteHoursList";
import { Site, MonthlyHours } from "@/components/builder/hours-management/types";

const LTIDetailsPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [hoursData, setHoursData] = useState<MonthlyHours>({});

  // Get the last 3 months
  const months = Array.from({ length: 3 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return format(startOfMonth(date), 'yyyy-MM');
  }).reverse();

  const { data: sites = [], isLoading: isLoadingSites, error: sitesError } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sites')
        .select('site_id, site_name, project_type, city, state, supervisor_name, supervisor_telephone')
        .order('site_name');
      
      if (error) throw error;
      return data as Site[];
    },
  });

  const { data: existingHours = [], isLoading: isLoadingHours } = useQuery({
    queryKey: ['hours-worked', months],
    queryFn: async () => {
      const startDate = months[0];
      const endDate = months[months.length - 1];
      
      const { data, error } = await supabase
        .from('hours_worked')
        .select('*')
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

  const filteredSites = sites.filter(site =>
    site.site_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoadingSites || isLoadingHours) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (sitesError) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-red-500">Error loading sites data. Please try again.</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/builder/senior')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">LTI Rate Details</h1>
      </div>

      <TimeSeriesChart selectedEmployerId={null} />

      <div className="mt-8 space-y-4">
        <h2 className="text-xl font-semibold">Hours Worked Management</h2>
        <SiteHoursSearch
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        <SiteHoursList
          sites={sites}
          months={months}
          hoursData={hoursData}
          setHoursData={setHoursData}
          filteredSites={filteredSites}
        />
      </div>
    </div>
  );
};

export default LTIDetailsPage;