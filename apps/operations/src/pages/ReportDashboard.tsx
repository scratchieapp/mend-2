import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmployerContext } from "@/hooks/useEmployerContext";
import { useAuth } from "@/lib/auth/AuthContext";
import { isMendStaff, isBuilderAdmin, isSiteAdmin } from "@/lib/auth/roles";
import { format, subMonths } from "date-fns";
import { 
  FileText, 
  Building2, 
  MapPin, 
  TrendingUp, 
  Calendar,
  ChevronRight,
  BarChart3,
  Shield,
  Loader2
} from "lucide-react";

interface Site {
  site_id: number;
  site_name: string;
  state: string | null;
}

interface Employer {
  employer_id: number;
  employer_name: string;
}

const ReportDashboard = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { selectedEmployerId, employers } = useEmployerContext();
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");

  // Get last 12 months for selection
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, "yyyy-MM"),
      label: format(date, "MMMM yyyy"),
    };
  });

  // Fetch sites for the selected employer
  const { data: sites = [], isLoading: isLoadingSites } = useQuery({
    queryKey: ['sites-for-reports', selectedEmployerId],
    queryFn: async () => {
      if (!selectedEmployerId) return [];
      const { data, error } = await supabase
        .from('sites')
        .select('site_id, site_name, state')
        .eq('employer_id', selectedEmployerId)
        .order('site_name');
      
      if (error) throw error;
      return data as Site[];
    },
    enabled: !!selectedEmployerId,
  });

  // Check user permissions
  const canViewEmployerReports = isMendStaff(userData) || isBuilderAdmin(userData);
  const canViewSiteReports = isMendStaff(userData) || isBuilderAdmin(userData) || isSiteAdmin(userData);

  const handleGenerateSiteReport = () => {
    if (selectedSiteId && selectedMonth) {
      navigate(`/reports/site/${selectedSiteId}?month=${selectedMonth}`);
    }
  };

  const handleGenerateEmployerReport = () => {
    if (selectedEmployerId && selectedMonth) {
      navigate(`/reports/employer/${selectedEmployerId}?month=${selectedMonth}`);
    }
  };

  const selectedEmployer = employers?.find(e => e.employer_id === selectedEmployerId);

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Safety Reports</h1>
        <p className="text-muted-foreground">
          Generate comprehensive safety performance reports with AI-powered insights
        </p>
      </div>

      {/* Report Period Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Report Period
          </CardTitle>
          <CardDescription>
            Select the month for your safety report
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full md:w-[280px]">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Report Type Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Site-Level Report Card */}
        {canViewSiteReports && (
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-full" />
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                  <MapPin className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <CardTitle>Site Report</CardTitle>
                  <CardDescription>
                    Detailed safety analysis for a specific site
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Site</label>
                {isLoadingSites ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading sites...
                  </div>
                ) : (
                  <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a site" />
                    </SelectTrigger>
                    <SelectContent>
                      {sites.map((site) => (
                        <SelectItem key={site.site_id} value={site.site_id.toString()}>
                          {site.site_name}
                          {site.state && <span className="text-muted-foreground ml-2">({site.state})</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="pt-2 space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span>Includes LTIFR, TRIFR, MTIFR calculations</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BarChart3 className="h-4 w-4" />
                  <span>Incident breakdown by type and mechanism</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>AI-generated executive summary</span>
                </div>
              </div>

              <Button 
                onClick={handleGenerateSiteReport}
                disabled={!selectedSiteId || !selectedMonth}
                className="w-full mt-4"
              >
                Generate Site Report
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Employer-Level Report Card */}
        {canViewEmployerReports && (
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-full" />
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle>Company Report</CardTitle>
                  <CardDescription>
                    Aggregated analysis across all sites
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Selected Company</label>
                <div className="p-3 bg-secondary rounded-lg">
                  <p className="font-medium">
                    {selectedEmployer?.employer_name || 'No company selected'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {sites.length} site{sites.length !== 1 ? 's' : ''} included
                  </p>
                </div>
              </div>

              <div className="pt-2 space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <span>Cross-jurisdictional benchmarking</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BarChart3 className="h-4 w-4" />
                  <span>State-by-state performance comparison</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>Strategic insights and recommendations</span>
                </div>
              </div>

              <Button 
                onClick={handleGenerateEmployerReport}
                disabled={!selectedEmployerId || !selectedMonth}
                className="w-full mt-4"
                variant="default"
              >
                Generate Company Report
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Stats Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Quick Overview
          </CardTitle>
          <CardDescription>
            Current period snapshot for {selectedEmployer?.employer_name || 'selected company'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-4 bg-secondary rounded-lg text-center">
              <p className="text-2xl font-bold text-emerald-600">{sites.length}</p>
              <p className="text-sm text-muted-foreground">Active Sites</p>
            </div>
            <div className="p-4 bg-secondary rounded-lg text-center">
              <p className="text-2xl font-bold">—</p>
              <p className="text-sm text-muted-foreground">Total Incidents</p>
            </div>
            <div className="p-4 bg-secondary rounded-lg text-center">
              <p className="text-2xl font-bold">—</p>
              <p className="text-sm text-muted-foreground">Current LTIFR</p>
            </div>
            <div className="p-4 bg-secondary rounded-lg text-center">
              <p className="text-2xl font-bold">—</p>
              <p className="text-sm text-muted-foreground">Hours Worked</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Generate a report to see detailed metrics
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportDashboard;

