import { DashboardHeader } from "@/components/builder/DashboardHeader";
import { MetricsCards } from "@/components/builder/MetricsCards";
import { PerformanceOverview } from "@/components/builder/PerformanceOverview";
import { TimeSeriesChart } from "@/components/builder/TimeSeriesChart";
import { SitesList } from "@/components/builder/SitesList";
import { SafetySummary } from "@/components/builder/SafetySummary";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileText, TrendingUp, Users, PlusCircle } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, startOfMonth } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BuilderErrorBoundary } from "@/components/builder/BuilderErrorBoundary";

const BuilderSeniorDashboard = () => {
  const navigate = useNavigate();
  const [selectedEmployerId, setSelectedEmployerId] = useState<number | null>(() => {
    const stored = localStorage.getItem("selectedEmployerId");
    return stored ? Number(stored) : 1;
  });

  const [selectedMonth, setSelectedMonth] = useState(() => {
    // Default to last month
    return format(subMonths(startOfMonth(new Date()), 1), 'yyyy-MM');
  });
  
  // Generate last 12 months for the dropdown
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(startOfMonth(new Date()), i + 1);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy')
    };
  });

  // Set employer context whenever selectedEmployerId changes
  useEffect(() => {
    const setEmployerContext = async () => {
      if (selectedEmployerId) {
        try {
          const { error } = await supabase.rpc('set_employer_context', {
            employer_id: selectedEmployerId
          });
          
          if (error) {
            console.error('Error setting employer context:', error);
          }
        } catch (error) {
          console.error('Error in setEmployerContext:', error);
        }
      }
    };

    setEmployerContext();
  }, [selectedEmployerId]);

  // Update selectedEmployerId when it changes in localStorage
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "selectedEmployerId" && e.newValue) {
        setSelectedEmployerId(Number(e.newValue));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <BuilderErrorBoundary>
      <MenuBar />
      <div className="container mx-auto p-6 space-y-6">
        <DashboardHeader />
        
        <div className="flex justify-between items-center mb-6">
          <Select
            value={selectedMonth}
            onValueChange={setSelectedMonth}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-4">
            <Button 
              variant="outline"
              onClick={() => navigate('/builder/workers')}
            >
              <Users className="mr-2 h-4 w-4" />
              Manage Workers
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/builder/senior/lti-details')}
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              View LTI Details
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/incident-report?new=true')}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              New Incident
            </Button>
            <Button 
              variant="default"
              onClick={() => navigate('/builder/senior/monthly-reports')}
            >
              <FileText className="mr-2 h-4 w-4" />
              Monthly Reports
            </Button>
          </div>
        </div>

        <SafetySummary selectedMonth={selectedMonth} />
        
        <MetricsCards 
          selectedEmployerId={selectedEmployerId} 
          selectedMonth={selectedMonth}
        />
        
        <div className="grid grid-cols-1 gap-6">
          <TimeSeriesChart selectedEmployerId={selectedEmployerId} />
        </div>
        
        <SitesList />
        
        <PerformanceOverview 
          selectedEmployerId={selectedEmployerId}
          selectedMonth={selectedMonth}
        />
      </div>
    </BuilderErrorBoundary>
  );
};

export default BuilderSeniorDashboard;