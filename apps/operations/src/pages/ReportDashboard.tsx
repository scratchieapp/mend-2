import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select";
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
  GraduationCap,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

interface Site {
  site_id: number;
  site_name: string;
  state: string | null;
  employer_id?: number;
}

interface Employer {
  employer_id: number;
  employer_name: string;
}

const ReportDashboard = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { selectedEmployerId: contextEmployerId, employers: contextEmployers } = useEmployerContext();
  
  // Default to last completed month (not current month since it's incomplete)
  const [selectedMonth, setSelectedMonth] = useState<string>(format(subMonths(new Date(), 1), "yyyy-MM"));
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  
  // For Mend staff: local state for employer selection on this page
  const [localSelectedEmployerId, setLocalSelectedEmployerId] = useState<string>("");
  
  // Check if user is Mend staff (roles 1-4)
  const userRoleId = userData?.role_id ? parseInt(userData.role_id) : null;
  const isMendUser = !!(userRoleId && userRoleId >= 1 && userRoleId <= 4);

  // Fetch all employers for Mend staff dropdown
  const { data: allEmployers = [], isLoading: isLoadingEmployers } = useQuery({
    queryKey: ['all-employers-for-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employers')
        .select('employer_id, employer_name')
        .order('employer_name');
      
      if (error) throw error;
      return data as Employer[];
    },
    enabled: isMendUser,
  });

  // Get the employer name - for roles 5,6,7 it comes from userData, for Mend staff from selection
  // Ensure employer_id is always a number for database queries
  const userEmployerId = userData?.employer_id ? Number(userData.employer_id) : null;
  
  // Effective employer ID: Mend staff uses local selection, others use context/userData
  const effectiveEmployerId = isMendUser 
    ? (localSelectedEmployerId ? parseInt(localSelectedEmployerId) : null)
    : (contextEmployerId || userEmployerId);
  
  // Find employer name from employers list OR from userData
  const selectedEmployerFromAll = allEmployers?.find(e => e.employer_id === effectiveEmployerId);
  const selectedEmployerFromContext = contextEmployers?.find(e => e.employer_id === effectiveEmployerId);
  const employerName = selectedEmployerFromAll?.employer_name || selectedEmployerFromContext?.employer_name || userData?.employer_name || 'Your Company';

  // Convert employers to searchable options
  const employerOptions: SearchableSelectOption[] = useMemo(() => {
    return allEmployers.map(emp => ({
      value: emp.employer_id.toString(),
      label: emp.employer_name,
    }));
  }, [allEmployers]);

  // Get last 12 COMPLETED months for selection (exclude current incomplete month)
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i + 1); // Start from last month (i+1), not current month
    return {
      value: format(date, "yyyy-MM"),
      label: format(date, "MMMM yyyy"),
    };
  });

  // Fetch sites - for Mend staff get ALL sites when no employer selected, or filter by employer
  const { data: sites = [], isLoading: isLoadingSites } = useQuery({
    queryKey: ['sites-for-reports', effectiveEmployerId, isMendUser],
    queryFn: async () => {
      let query = supabase
        .from('sites')
        .select('site_id, site_name, state, employer_id')
        .order('site_name');
      
      // If employer is selected, filter by it
      if (effectiveEmployerId) {
        query = query.eq('employer_id', effectiveEmployerId);
      } else if (!isMendUser) {
        // Non-Mend staff must have an employer
        return [];
      }
      // For Mend staff with no employer selected, get all sites
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Site[];
    },
    enabled: isMendUser || !!effectiveEmployerId,
  });

  // Convert sites to searchable options
  const siteOptions: SearchableSelectOption[] = useMemo(() => {
    return sites.map(site => ({
      value: site.site_id.toString(),
      label: site.site_name,
      description: site.state || undefined,
    }));
  }, [sites]);

  // Reset site selection when employer changes
  const handleEmployerChange = (value: string) => {
    setLocalSelectedEmployerId(value);
    setSelectedSiteId(""); // Reset site when employer changes
  };

  // Fetch quick stats for the selected month using the RBAC-aware RPC (same as IncidentsChart)
  // For Mend staff with no employer selected, show ALL incidents across the system
  const { data: quickStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['quick-stats', effectiveEmployerId, selectedMonth, isMendUser],
    queryFn: async () => {
      const monthStart = `${selectedMonth}-01`;
      const monthEnd = new Date(Number(selectedMonth.split('-')[0]), Number(selectedMonth.split('-')[1]), 0);
      const monthEndStr = format(monthEnd, 'yyyy-MM-dd');
      
      // Use get_dashboard_data RPC (same as IncidentsChart) - this bypasses RLS issues
      // Pass null employer_id to get ALL data for Mend staff
      const { data: dashboardData, error: incError } = await supabase.rpc('get_dashboard_data', {
        page_size: 1000,
        page_offset: 0,
        filter_employer_id: effectiveEmployerId || null, // null = all employers for Mend staff
        filter_worker_id: null,
        filter_start_date: monthStart,
        filter_end_date: monthEndStr,
        user_role_id: userData?.role_id || 5,
        user_employer_id: effectiveEmployerId || (isMendUser ? null : userEmployerId),
        filter_archive_status: 'active'
      });
      
      if (incError) {
        console.error('[ReportDashboard] Error fetching incidents via RPC:', incError);
      }
      
      const incidents = dashboardData?.incidents || [];
      
      // Fetch hours worked for the month
      // If no employer selected (Mend staff viewing all), get all hours
      let hoursQuery = supabase
        .from('hours_worked')
        .select('employer_hours, subcontractor_hours')
        .eq('month', monthStart);
      
      if (effectiveEmployerId) {
        hoursQuery = hoursQuery.eq('employer_id', effectiveEmployerId);
      }
      
      const { data: hours, error: hoursError } = await hoursQuery;
      
      if (hoursError) {
        console.error('[ReportDashboard] Error fetching hours:', hoursError);
      }
      
      const totalHours = hours?.reduce((sum, h) => 
        sum + Number(h.employer_hours || 0) + Number(h.subcontractor_hours || 0), 0) || 0;
      
      // Handle classification variations (LTI, Lost Time Injury, etc.)
      const isLTI = (classification: string | null) => {
        if (!classification) return false;
        const c = classification.toUpperCase();
        return c === 'LTI' || c === 'LOST TIME INJURY' || c === 'LOST TIME';
      };
      const isMTI = (classification: string | null) => {
        if (!classification) return false;
        const c = classification.toUpperCase();
        return c === 'MTI' || c === 'MEDICAL TREATMENT INJURY' || c === 'MEDICAL TREATMENT';
      };
      
      const ltiCount = incidents.filter((i: any) => isLTI(i.classification)).length;
      const mtiCount = incidents.filter((i: any) => isMTI(i.classification)).length;
      const totalIncidents = incidents.length;
      
      // Calculate LTIFR (per million hours) - standard formula
      // LTIFR = (Number of LTIs / Total Hours Worked) × 1,000,000
      const ltifr = totalHours > 0 ? ((ltiCount / totalHours) * 1000000) : 0;
      
      return {
        totalIncidents,
        ltiCount,
        mtiCount,
        totalHours,
        ltifr: ltifr.toFixed(1),
      };
    },
    enabled: isMendUser || !!effectiveEmployerId, // Enable for Mend staff even without employer selected
  });

  // Check hours completion status for last 3 completed months
  const { data: hoursStatus } = useQuery({
    queryKey: ['hours-status', effectiveEmployerId, sites],
    queryFn: async () => {
      if (!effectiveEmployerId || sites.length === 0) {
        console.log('[ReportDashboard] No employer or sites for hours status check');
        return { complete: false, missing: 0, total: 0 };
      }
      
      // Last 3 completed months (not including current)
      const completedMonths = Array.from({ length: 3 }, (_, i) => {
        const date = subMonths(new Date(), i + 1);
        return format(date, 'yyyy-MM') + '-01';
      });
      
      console.log('[ReportDashboard] Checking hours for months:', completedMonths, 'employer:', effectiveEmployerId);
      
      // Fetch hours with actual values (employer_hours > 0 OR subcontractor_hours > 0)
      const { data: hours, error } = await supabase
        .from('hours_worked')
        .select('site_id, month, employer_hours, subcontractor_hours')
        .eq('employer_id', effectiveEmployerId)
        .in('month', completedMonths);
      
      if (error) {
        console.error('[ReportDashboard] Error checking hours status:', error);
        return { complete: false, missing: 0, total: 0 };
      }
      
      console.log('[ReportDashboard] Hours data returned:', hours);
      
      // Only count entries that have actual hours > 0
      const validEntries = hours?.filter(h => 
        (Number(h.employer_hours) > 0 || Number(h.subcontractor_hours) > 0)
      ) || [];
      
      console.log('[ReportDashboard] Valid entries with hours > 0:', validEntries);
      
      // Create a Set of "siteId-month" to check coverage
      const coveredSiteMonths = new Set(
        validEntries.map(h => `${h.site_id}-${h.month}`)
      );
      
      console.log('[ReportDashboard] Covered site-months:', Array.from(coveredSiteMonths));
      
      // Count how many site-months have valid data
      const siteIds = sites.map(s => s.site_id);
      let missingCount = 0;
      const missingSiteMonths: string[] = [];
      
      for (const month of completedMonths) {
        for (const siteId of siteIds) {
          if (!coveredSiteMonths.has(`${siteId}-${month}`)) {
            missingCount++;
            missingSiteMonths.push(`${siteId}-${month}`);
          }
        }
      }
      
      console.log('[ReportDashboard] Missing site-months:', missingSiteMonths);
      
      const expectedEntries = sites.length * 3; // 3 months × sites
      
      return {
        complete: missingCount === 0,
        missing: missingCount,
        total: expectedEntries
      };
    },
    enabled: !!effectiveEmployerId && sites.length > 0,
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
              <div className="space-y-4">
                {/* Employer Selection for Mend Staff */}
                {isMendUser && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select Company</label>
                    {isLoadingEmployers ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading companies...
                      </div>
                    ) : (
                      <SearchableSelect
                        options={employerOptions}
                        value={localSelectedEmployerId}
                        onValueChange={handleEmployerChange}
                        placeholder="Search for a company..."
                        searchPlaceholder="Type to search companies..."
                        emptyMessage="No company found."
                        icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
                      />
                    )}
                  </div>
                )}
                
                {/* Site Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Site</label>
                  {isLoadingSites ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading sites...
                    </div>
                  ) : isMendUser && !localSelectedEmployerId ? (
                    <p className="text-sm text-muted-foreground">Select a company first</p>
                  ) : sites.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No sites found for {employerName}</p>
                  ) : (
                    <SearchableSelect
                      options={siteOptions}
                      value={selectedSiteId}
                      onValueChange={setSelectedSiteId}
                      placeholder="Search for a site..."
                      searchPlaceholder="Type to search sites..."
                      emptyMessage="No site found."
                      icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
                    />
                  )}
                </div>
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
                <label className="text-sm font-medium">Select Company</label>
                {isMendUser ? (
                  isLoadingEmployers ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading companies...
                    </div>
                  ) : (
                    <>
                      <SearchableSelect
                        options={employerOptions}
                        value={localSelectedEmployerId}
                        onValueChange={handleEmployerChange}
                        placeholder="Search for a company..."
                        searchPlaceholder="Type to search companies..."
                        emptyMessage="No company found."
                        icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
                      />
                      {effectiveEmployerId && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {sites.length} site{sites.length !== 1 ? 's' : ''} included
                        </p>
                      )}
                    </>
                  )
                ) : (
                  <div className="p-3 bg-secondary rounded-lg">
                    <p className="font-medium">
                      {employerName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {sites.length} site{sites.length !== 1 ? 's' : ''} included
                    </p>
                  </div>
                )}
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

      {/* Hours Entry - Minimized inline prompt */}
      {effectiveEmployerId && !hoursStatus?.complete && (
        <div className="flex items-center justify-between p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-sm text-muted-foreground">
              {hoursStatus?.missing ? `${hoursStatus.missing} site-months missing hours data.` : 'Hours data needed for accurate LTIFR calculations.'}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            className="shrink-0 text-amber-700 hover:text-amber-800 hover:bg-amber-100"
            onClick={() => navigate('/hours-management')}
          >
            <Clock className="h-4 w-4 mr-1" />
            Enter Hours
          </Button>
        </div>
      )}

      {/* Quick Stats Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Quick Overview
          </CardTitle>
          <CardDescription>
            {format(new Date(selectedMonth), "MMMM yyyy")} snapshot for {effectiveEmployerId ? employerName : 'All Companies'}
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
                {isLoadingStats ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : quickStats?.totalIncidents ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">Total Incidents</p>
            </div>
            <div className="p-4 bg-secondary rounded-lg text-center">
              <p className={`text-2xl font-bold ${quickStats?.ltifr && Number(quickStats.ltifr) > 4 ? 'text-red-600' : ''}`}>
                {isLoadingStats ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : quickStats?.ltifr ?? '0.0'}
              </p>
              <p className="text-sm text-muted-foreground">Current LTIFR</p>
            </div>
            <div className="p-4 bg-secondary rounded-lg text-center">
              <p className="text-2xl font-bold">
                {isLoadingStats ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 
                  quickStats?.totalHours ? quickStats.totalHours.toLocaleString() : '0'}
              </p>
              <p className="text-sm text-muted-foreground">Hours Worked</p>
            </div>
          </div>
          {quickStats?.totalHours === 0 && effectiveEmployerId && (
            <p className="text-xs text-amber-600 mt-4 text-center">
              ⚠️ No hours recorded for this month. <Link to="/hours-management" className="underline">Enter hours</Link> to enable LTIFR calculations.
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

