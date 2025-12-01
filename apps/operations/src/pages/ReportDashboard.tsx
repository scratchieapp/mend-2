import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
  Loader2,
  Clock,
  Lightbulb,
  GraduationCap
} from "lucide-react";

interface Site {
  site_id: number;
  site_name: string;
  state: string | null;
}

const ReportDashboard = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { selectedEmployerId, employers, statistics } = useEmployerContext();
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");

  // Get the employer name - for roles 5,6,7 it comes from userData, for Mend staff from selection
  const userEmployerId = userData?.employer_id;
  const effectiveEmployerId = selectedEmployerId || userEmployerId;
  
  // Find employer name from employers list OR from userData
  const selectedEmployer = employers?.find(e => e.employer_id === effectiveEmployerId);
  const employerName = selectedEmployer?.employer_name || userData?.employer_name || 'Your Company';

  // Get last 12 months for selection
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, "yyyy-MM"),
      label: format(date, "MMMM yyyy"),
    };
  });

  // Fetch sites for the effective employer (user's employer for roles 5,6,7)
  const { data: sites = [], isLoading: isLoadingSites } = useQuery({
    queryKey: ['sites-for-reports', effectiveEmployerId],
    queryFn: async () => {
      if (!effectiveEmployerId) return [];
      const { data, error } = await supabase
        .from('sites')
        .select('site_id, site_name, state')
        .eq('employer_id', effectiveEmployerId)
        .order('site_name');
      
      if (error) throw error;
      return data as Site[];
    },
    enabled: !!effectiveEmployerId,
  });

  // Fetch quick stats for the selected month
  const { data: quickStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['quick-stats', effectiveEmployerId, selectedMonth],
    queryFn: async () => {
      if (!effectiveEmployerId) return null;
      
      const monthStart = `${selectedMonth}-01`;
      const monthEnd = new Date(Number(selectedMonth.split('-')[0]), Number(selectedMonth.split('-')[1]), 0);
      const monthEndStr = format(monthEnd, 'yyyy-MM-dd');
      
      // Fetch incidents for the month
      const { data: incidents, error: incError } = await supabase
        .from('incidents')
        .select('classification')
        .eq('employer_id', effectiveEmployerId)
        .gte('date_of_injury', monthStart)
        .lte('date_of_injury', monthEndStr);
      
      if (incError) console.error('Error fetching incidents:', incError);
      
      // Fetch hours worked for the month
      const { data: hours, error: hoursError } = await supabase
        .from('hours_worked')
        .select('employer_hours, subcontractor_hours')
        .eq('employer_id', effectiveEmployerId)
        .eq('month', monthStart);
      
      if (hoursError) console.error('Error fetching hours:', hoursError);
      
      const totalHours = hours?.reduce((sum, h) => 
        sum + Number(h.employer_hours || 0) + Number(h.subcontractor_hours || 0), 0) || 0;
      
      const ltiCount = incidents?.filter(i => i.classification === 'LTI').length || 0;
      const mtiCount = incidents?.filter(i => i.classification === 'MTI').length || 0;
      const totalIncidents = incidents?.length || 0;
      
      // Calculate LTIFR (per million hours)
      const ltifr = totalHours > 0 ? ((ltiCount / totalHours) * 1000000) : 0;
      
      return {
        totalIncidents,
        ltiCount,
        mtiCount,
        totalHours,
        ltifr: ltifr.toFixed(1),
      };
    },
    enabled: !!effectiveEmployerId,
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
    if (effectiveEmployerId && selectedMonth) {
      navigate(`/reports/employer/${effectiveEmployerId}?month=${selectedMonth}`);
    }
  };

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
          <Card className="relative overflow-hidden flex flex-col">
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
            <CardContent className="flex-1 flex flex-col">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Site</label>
                {isLoadingSites ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading sites...
                  </div>
                ) : sites.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No sites found for {employerName}</p>
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

              <div className="pt-4 space-y-3">
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

              <div className="mt-auto pt-4">
                <Button 
                  onClick={handleGenerateSiteReport}
                  disabled={!selectedSiteId || !selectedMonth}
                  className="w-full"
                >
                  Generate Site Report
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Employer-Level Report Card */}
        {canViewEmployerReports && (
          <Card className="relative overflow-hidden flex flex-col">
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
            <CardContent className="flex-1 flex flex-col">
              <div className="space-y-2">
                <label className="text-sm font-medium">Selected Company</label>
                <div className="p-3 bg-secondary rounded-lg">
                  <p className="font-medium">
                    {employerName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {sites.length} site{sites.length !== 1 ? 's' : ''} included
                  </p>
                </div>
              </div>

              <div className="pt-4 space-y-3">
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

              <div className="mt-auto pt-4">
                <Button 
                  onClick={handleGenerateEmployerReport}
                  disabled={!effectiveEmployerId || !selectedMonth}
                  className="w-full"
                  variant="default"
                >
                  Generate Company Report
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Hours Entry Card */}
      <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-600" />
            Hours Worked Entry
          </CardTitle>
          <CardDescription>
            Accurate hours data is essential for meaningful frequency rate calculations
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Hours worked form the denominator for LTIFR, TRIFR, and MTIFR calculations. 
              Without accurate hours, these metrics lose their meaning.
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              💡 Tip: Enter hours monthly for each site to keep your reports accurate.
            </p>
          </div>
          <Button 
            variant="outline" 
            className="shrink-0 border-amber-300 hover:bg-amber-100 dark:border-amber-800 dark:hover:bg-amber-900/50"
            onClick={() => navigate('/builder/hours-management')}
          >
            <Clock className="h-4 w-4 mr-2" />
            Enter Hours
          </Button>
        </CardContent>
      </Card>

      {/* Quick Stats Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Quick Overview
          </CardTitle>
          <CardDescription>
            {format(new Date(selectedMonth), "MMMM yyyy")} snapshot for {employerName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-4 bg-secondary rounded-lg text-center">
              <p className="text-2xl font-bold text-emerald-600">{sites.length}</p>
              <p className="text-sm text-muted-foreground">Active Sites</p>
            </div>
            <div className="p-4 bg-secondary rounded-lg text-center">
              <p className="text-2xl font-bold">
                {isLoadingStats ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : quickStats?.totalIncidents ?? '—'}
              </p>
              <p className="text-sm text-muted-foreground">Total Incidents</p>
            </div>
            <div className="p-4 bg-secondary rounded-lg text-center">
              <p className={`text-2xl font-bold ${quickStats?.ltifr && Number(quickStats.ltifr) > 4 ? 'text-red-600' : ''}`}>
                {isLoadingStats ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : quickStats?.ltifr ?? '—'}
              </p>
              <p className="text-sm text-muted-foreground">Current LTIFR</p>
            </div>
            <div className="p-4 bg-secondary rounded-lg text-center">
              <p className="text-2xl font-bold">
                {isLoadingStats ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 
                  quickStats?.totalHours ? quickStats.totalHours.toLocaleString() : '—'}
              </p>
              <p className="text-sm text-muted-foreground">Hours Worked</p>
            </div>
          </div>
          {quickStats?.totalHours === 0 && (
            <p className="text-xs text-amber-600 mt-4 text-center">
              ⚠️ No hours recorded for this month. <Link to="/builder/hours-management" className="underline">Enter hours</Link> to enable LTIFR calculations.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Educational Approach Section */}
      <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border-indigo-200 dark:border-indigo-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-indigo-600" />
            Learning from Safety Data
          </CardTitle>
          <CardDescription>
            Beyond compliance: What can we learn?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-white/60 dark:bg-white/5 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                <p className="font-medium">Key Questions</p>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 ml-7">
                <li>• What did we learn from the last incident?</li>
                <li>• What patterns emerged this month?</li>
                <li>• Where are our systems succeeding?</li>
                <li>• What would we do differently?</li>
              </ul>
            </div>
            <div className="p-4 bg-white/60 dark:bg-white/5 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-500" />
                <p className="font-medium">Health-Based Approach</p>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 ml-7">
                <li>• Focus on worker wellbeing, not just metrics</li>
                <li>• Early intervention prevents serious injuries</li>
                <li>• Near-misses are learning opportunities</li>
                <li>• Psychological safety enables reporting</li>
              </ul>
            </div>
          </div>
          <p className="text-xs text-indigo-700 dark:text-indigo-400 text-center">
            While LTIs matter for cost management, true safety excellence comes from continuous learning and a health-first culture.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportDashboard;

