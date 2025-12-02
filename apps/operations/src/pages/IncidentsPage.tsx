import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Download, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { IncidentsList } from "@/components/dashboard/IncidentsList";
import { IncidentsChart } from "@/components/incidents/IncidentsChart";
import { IncidentHeatMap } from "@/components/incidents/IncidentHeatMap";
import { useEmployerContext } from "@/hooks/useEmployerContext";
import { useAuth } from "@/lib/auth/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, BarChart3 } from "lucide-react";

export default function IncidentsPage() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { selectedEmployerId: contextEmployerId } = useEmployerContext();
  
  // Get user role
  const userRoleId = userData?.role_id ? parseInt(userData.role_id) : null;
  
  // Mend staff (roles 1-4) can filter by employer
  const isMendStaff = !!(userRoleId && userRoleId >= 1 && userRoleId <= 4);
  
  // State for employer filter (only used by Mend staff)
  const [employerFilter, setEmployerFilter] = useState<string>('all');
  
  // Fetch employers list for Mend staff filter
  const { data: employers = [] } = useQuery({
    queryKey: ['employers-list-for-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employers')
        .select('employer_id, employer_name')
        .order('employer_name');
      
      if (error) {
        console.error('Error fetching employers:', error);
        return [];
      }
      return data || [];
    },
    enabled: isMendStaff,
    staleTime: 5 * 60 * 1000,
  });
  
  // Determine the effective employer ID based on role and filter
  const getEffectiveEmployerId = (): number | null => {
    if (isMendStaff) {
      // Mend staff can filter or view all
      return employerFilter === 'all' ? null : parseInt(employerFilter);
    }
    // Non-Mend staff use context or their own employer
    return contextEmployerId || (userData?.employer_id ? parseInt(userData.employer_id) : null);
  };
  
  const effectiveEmployerId = getEffectiveEmployerId();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Incidents</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all workplace incidents
          </p>
        </div>
        <div className="flex gap-3">
          {/* Employer Filter - only for Mend staff */}
          {isMendStaff && (
            <Select value={employerFilter} onValueChange={setEmployerFilter}>
              <SelectTrigger className="w-[220px]">
                <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Filter by employer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employers</SelectItem>
                {employers.map((emp) => (
                  <SelectItem key={emp.employer_id} value={emp.employer_id.toString()}>
                    {emp.employer_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
          <Button 
            className="gap-2"
            onClick={() => navigate('/incident-report?new=true')}
          >
            <PlusCircle className="h-4 w-4" />
            Record New Incident
          </Button>
        </div>
      </div>

      {/* Map and Chart - side by side for Mend staff */}
      {isMendStaff ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ minHeight: '450px' }}>
          {/* Incident Heat Map */}
          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Site Incident Map
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 flex-1">
              <IncidentHeatMap
                employerId={effectiveEmployerId}
                userRoleId={userRoleId}
                height="100%"
              />
            </CardContent>
          </Card>

          {/* Incidents Chart */}
          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                Incidents Over Time
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 flex-1 flex flex-col justify-center">
              <IncidentsChart 
                employerId={effectiveEmployerId} 
                userRoleId={userRoleId}
                height={380}
                hideCard
              />
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Non-Mend staff just see the chart */
        <IncidentsChart 
          employerId={effectiveEmployerId} 
          userRoleId={userRoleId}
        />
      )}

      {/* Incidents List */}
      <IncidentsList 
        selectedEmployerId={effectiveEmployerId}
        maxHeight={isMendStaff ? "calc(100vh - 620px)" : "calc(100vh - 550px)"}
      />
    </div>
  );
}

