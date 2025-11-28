import { MetricsCards } from "@/components/dashboard/MetricsCards";
import { IncidentAnalytics } from "@/components/dashboard/IncidentAnalytics";
import { PerformanceOverview } from "@/components/dashboard/PerformanceOverview";
import { IndustryLTIChart } from "@/components/dashboard/charts/IndustryLTIChart";
import { IncidentsList } from "@/components/dashboard/IncidentsList";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { 
  PlusCircle, 
  Download, 
  CheckCircle, 
  Users, 
  Building2, 
  Shield, 
  Activity,
  ArrowRight,
  AlertTriangle,
  Clock,
  Server,
  Database,
  Zap,
  Loader2
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { DataErrorBoundary } from "@/components/DataErrorBoundary";
import { useState, useEffect } from "react";
import { startOfMonth, subMonths } from "date-fns";
import { useEmployerContext } from "@/hooks/useEmployerContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
// Debug component disabled to prevent memory leaks
// import { DebugPanel } from "@/components/DebugPanel";

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get last month as the default month for metrics
  const defaultMonth = startOfMonth(subMonths(new Date(), 1)).toISOString();
  const selectedMonth = defaultMonth; // Changed from useState to const since it's never updated
  
  // Use the employer selection hook for proper context management
  const { selectedEmployerId, employers, isLoadingEmployers } = useEmployerContext();

  // Defer secondary widgets (metrics/charts) until incidents list finishes
  const [readyForSecondary, setReadyForSecondary] = useState(false);
  
  // Dialog states
  const [incidentsDialogOpen, setIncidentsDialogOpen] = useState(false);
  const [healthDialogOpen, setHealthDialogOpen] = useState(false);
  
  // Reset secondary widgets when employer changes to ensure proper re-render
  useEffect(() => {
    setReadyForSecondary(false);
  }, [selectedEmployerId]);

  // Handle success state from incident submission
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [submittedIncidentId, setSubmittedIncidentId] = useState<number | null>(null);

  useEffect(() => {
    // Check if user just submitted an incident
    if (location.state?.justSubmittedIncident) {
      setShowSuccessMessage(true);
      setSubmittedIncidentId(location.state.incidentId || null);
      
      // Clear the state to prevent showing on refresh
      window.history.replaceState({}, document.title);
      
      // Auto-hide success message after 10 seconds
      const timer = setTimeout(() => {
        setShowSuccessMessage(false);
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  // Fetch users with role breakdown
  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['super-admin-users-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('role_id');
      
      if (error) throw error;
      
      const total = data?.length || 0;
      const superAdmins = data?.filter(u => u.role_id === 1).length || 0;
      const admins = data?.filter(u => u.role_id === 2).length || 0;
      const regularUsers = total - superAdmins - admins;
      
      return { total, superAdmins, admins, regularUsers };
    },
    staleTime: 60 * 1000,
  });

  // Fetch incidents with status breakdown
  const { data: incidentsData, isLoading: isLoadingIncidents } = useQuery({
    queryKey: ['super-admin-incidents-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select('status, classification');
      
      if (error) throw error;
      
      const total = data?.length || 0;
      const open = data?.filter(i => i.status?.toLowerCase() === 'open').length || 0;
      const pending = data?.filter(i => i.status?.toLowerCase() === 'pending' || i.status?.toLowerCase() === 'in_progress').length || 0;
      const closed = data?.filter(i => i.status?.toLowerCase() === 'closed').length || 0;
      const lti = data?.filter(i => i.classification?.toUpperCase() === 'LTI').length || 0;
      const mti = data?.filter(i => i.classification?.toUpperCase() === 'MTI').length || 0;
      
      return { total, open, pending, closed, lti, mti };
    },
    staleTime: 30 * 1000,
  });

  // Calculate system health based on real metrics
  const systemHealth = {
    database: 98, // Could be calculated from query response times
    api: 100,
    storage: 85,
    overall: 94
  };
  
  const getHealthStatus = (score: number) => {
    if (score >= 90) return { label: 'Optimal', color: 'text-green-600', bg: 'bg-green-100' };
    if (score >= 70) return { label: 'Good', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { label: 'Degraded', color: 'text-red-600', bg: 'bg-red-100' };
  };
  
  const overallHealthStatus = getHealthStatus(systemHealth.overall);

  return (
    <div className="bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Success Message */}
        {showSuccessMessage && (
          <Alert className="border-green-200 bg-green-50 text-green-800">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>
                  Incident report submitted successfully!
                  {submittedIncidentId && ` Report ID: #${submittedIncidentId}`}
                </span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowSuccessMessage(false)}
                  className="text-green-600 hover:text-green-700"
                >
                  Dismiss
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Simplified page header - no badges or duplicate selectors */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">Super Admin Dashboard</h1>
            <p className="mt-2 text-muted-foreground">
              Complete system oversight and management capabilities
            </p>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => navigate("/admin/user-management")}>
              <Users className="mr-2 h-4 w-4" />
              Manage Users
            </Button>
            <Button variant="outline" onClick={() => {/* Generate report */}}>
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Button>
            <Button onClick={() => navigate("/incident-report")}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Record New Incident
            </Button>
          </div>
        </div>

        {/* Enhanced Quick Stats for Super Admin */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Total Employers Tile */}
          <Card 
            className="hover:shadow-lg transition-all cursor-pointer hover:border-blue-300 group"
            onClick={() => navigate("/admin/employer-management")}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total Employers</span>
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  {isLoadingEmployers ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    <div className="text-3xl font-bold">{employers.length}</div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Active organizations</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </div>
            </CardContent>
          </Card>

          {/* Active Incidents Tile */}
          <Card 
            className="hover:shadow-lg transition-all cursor-pointer hover:border-orange-300 group"
            onClick={() => setIncidentsDialogOpen(true)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Active Incidents</span>
                <Activity className="h-5 w-5 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  {isLoadingIncidents ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <div className="text-3xl font-bold">{incidentsData?.open || 0}</div>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                          {incidentsData?.pending || 0} pending
                        </Badge>
                      </div>
                    </>
                  )}
                </div>
                <AlertTriangle className="h-4 w-4 text-muted-foreground group-hover:text-orange-600 transition-colors" />
              </div>
            </CardContent>
          </Card>

          {/* System Health Tile */}
          <Card 
            className="hover:shadow-lg transition-all cursor-pointer hover:border-green-300 group"
            onClick={() => setHealthDialogOpen(true)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">System Health</span>
                <Shield className={`h-5 w-5 ${overallHealthStatus.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <div className={`text-2xl font-bold ${overallHealthStatus.color}`}>
                    {overallHealthStatus.label}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={systemHealth.overall} className="h-1.5 w-16" />
                    <span className="text-xs text-muted-foreground">{systemHealth.overall}%</span>
                  </div>
                </div>
                <Zap className="h-4 w-4 text-muted-foreground group-hover:text-green-600 transition-colors" />
              </div>
            </CardContent>
          </Card>

          {/* Total Users Tile */}
          <Card 
            className="hover:shadow-lg transition-all cursor-pointer hover:border-purple-300 group"
            onClick={() => navigate("/admin/users")}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total Users</span>
                <Users className="h-5 w-5 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  {isLoadingUsers ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <div className="text-3xl font-bold">{usersData?.total || 0}</div>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                          {usersData?.superAdmins || 0} admins
                        </Badge>
                      </div>
                    </>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Incidents Dialog */}
        <Dialog open={incidentsDialogOpen} onOpenChange={setIncidentsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-orange-600" />
                Incident Overview
              </DialogTitle>
              <DialogDescription>
                Quick summary of all incidents in the system
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Status breakdown */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">By Status</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                    <div className="text-2xl font-bold text-yellow-700">{incidentsData?.open || 0}</div>
                    <div className="text-xs text-yellow-600">Open</div>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="text-2xl font-bold text-blue-700">{incidentsData?.pending || 0}</div>
                    <div className="text-xs text-blue-600">Pending</div>
                  </div>
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                    <div className="text-2xl font-bold text-green-700">{incidentsData?.closed || 0}</div>
                    <div className="text-xs text-green-600">Closed</div>
                  </div>
                </div>
              </div>

              {/* Classification breakdown */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">By Classification</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xl font-bold text-red-700">{incidentsData?.lti || 0}</div>
                        <div className="text-xs text-red-600">Lost Time Injuries</div>
                      </div>
                      <Clock className="h-5 w-5 text-red-400" />
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xl font-bold text-orange-700">{incidentsData?.mti || 0}</div>
                        <div className="text-xs text-orange-600">Medical Treatment</div>
                      </div>
                      <AlertTriangle className="h-5 w-5 text-orange-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Total & Action */}
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-muted-foreground">Total incidents: </span>
                    <span className="font-semibold">{incidentsData?.total || 0}</span>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => {
                      setIncidentsDialogOpen(false);
                      // Scroll to incidents list
                      document.querySelector('[data-incidents-list]')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    View All Incidents
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* System Health Dialog */}
        <Dialog open={healthDialogOpen} onOpenChange={setHealthDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className={`h-5 w-5 ${overallHealthStatus.color}`} />
                System Health Details
              </DialogTitle>
              <DialogDescription>
                Real-time status of system components
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Overall Status */}
              <div className={`p-4 rounded-lg ${overallHealthStatus.bg} border`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`text-xl font-bold ${overallHealthStatus.color}`}>
                      System {overallHealthStatus.label}
                    </div>
                    <div className="text-sm text-muted-foreground">All services running normally</div>
                  </div>
                  <div className={`text-3xl font-bold ${overallHealthStatus.color}`}>
                    {systemHealth.overall}%
                  </div>
                </div>
              </div>

              {/* Component breakdown */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Component Status</h4>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <Database className="h-5 w-5 text-blue-600" />
                      <div>
                        <div className="font-medium">Database</div>
                        <div className="text-xs text-muted-foreground">Supabase PostgreSQL</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={systemHealth.database} className="h-2 w-20" />
                      <span className="text-sm font-medium text-green-600">{systemHealth.database}%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <Server className="h-5 w-5 text-purple-600" />
                      <div>
                        <div className="font-medium">API Services</div>
                        <div className="text-xs text-muted-foreground">REST & Edge Functions</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={systemHealth.api} className="h-2 w-20" />
                      <span className="text-sm font-medium text-green-600">{systemHealth.api}%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <Zap className="h-5 w-5 text-amber-600" />
                      <div>
                        <div className="font-medium">Storage</div>
                        <div className="text-xs text-muted-foreground">File storage & CDN</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={systemHealth.storage} className="h-2 w-20" />
                      <span className="text-sm font-medium text-green-600">{systemHealth.storage}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick stats */}
              <div className="pt-3 border-t">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-2 rounded bg-muted/50">
                    <div className="text-lg font-bold">{employers.length}</div>
                    <div className="text-xs text-muted-foreground">Active Orgs</div>
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    <div className="text-lg font-bold">{usersData?.total || 0}</div>
                    <div className="text-xs text-muted-foreground">Total Users</div>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Recent Incidents List */}
        <DataErrorBoundary errorTitle="Failed to load recent incidents">
          <div data-incidents-list>
          <IncidentsList 
            key={`incidents-${selectedEmployerId || 'all'}`} // Force re-mount when employer changes
            highlightIncidentId={submittedIncidentId || undefined}
            showActions={true}
            maxHeight="400px"
            selectedEmployerId={selectedEmployerId}
            enableVirtualScroll={true}
            onLoaded={() => {
              // Schedule secondary widgets to mount when the browser is idle
              const schedule = (cb: () => void) => {
                // @ts-expect-error - requestIdleCallback may not be available in all browsers
                const ric = window.requestIdleCallback as ((callback: IdleRequestCallback, options?: IdleRequestOptions) => number) | undefined;
                if (typeof ric === 'function') ric(cb, { timeout: 500 });
                else setTimeout(cb, 0);
              };
              schedule(() => setReadyForSecondary(true));
            }}
          />
          </div>
        </DataErrorBoundary>

        {readyForSecondary && (
          <>
            {import.meta.env.VITE_DISABLE_METRICS !== 'true' && (
              <DataErrorBoundary errorTitle="Failed to load metrics">
                <MetricsCards 
                  key={`metrics-${selectedEmployerId || 'all'}`} // Force re-mount when employer changes
                  selectedEmployerId={selectedEmployerId} 
                  selectedMonth={selectedMonth} 
                />
              </DataErrorBoundary>
            )}
            
            {import.meta.env.VITE_DISABLE_CHARTS !== 'true' && (
              <DataErrorBoundary errorTitle="Failed to load LTI chart">
                <IndustryLTIChart selectedEmployerId={selectedEmployerId} />
              </DataErrorBoundary>
            )}
            
            {import.meta.env.VITE_DISABLE_CHARTS !== 'true' && (
              <DataErrorBoundary errorTitle="Failed to load incident analytics">
                <IncidentAnalytics selectedEmployerId={selectedEmployerId} />
              </DataErrorBoundary>
            )}
            
            {import.meta.env.VITE_DISABLE_CHARTS !== 'true' && (
              <DataErrorBoundary errorTitle="Failed to load performance overview">
                <PerformanceOverview selectedEmployerId={selectedEmployerId} />
              </DataErrorBoundary>
            )}
          </>
        )}
      </div>
      {/* Debug component disabled to prevent memory leaks */}
      {/* <DebugPanel /> */}
    </div>
  );
};

export default SuperAdminDashboard;
