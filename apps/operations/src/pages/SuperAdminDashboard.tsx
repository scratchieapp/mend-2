import { MetricsCards } from "@/components/dashboard/MetricsCards";
import { IncidentAnalytics } from "@/components/dashboard/IncidentAnalytics";
import { PerformanceOverview } from "@/components/dashboard/PerformanceOverview";
import { IndustryLTIChart } from "@/components/dashboard/charts/IndustryLTIChart";
import { IncidentsListOptimized } from "@/components/dashboard/IncidentsListOptimized";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Download, CheckCircle, Users, Building2, Shield, Activity } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { MenuBar } from "@/components/MenuBar";
import { DataErrorBoundary } from "@/components/DataErrorBoundary";
import { useState, useEffect } from "react";
import { startOfMonth, subMonths } from "date-fns";
import { useEmployerSelection } from "@/hooks/useEmployerSelection";
// Debug component disabled to prevent memory leaks
// import { DebugPanel } from "@/components/DebugPanel";
import { Badge } from "@/components/ui/badge";

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get last month as the default month for metrics
  const defaultMonth = startOfMonth(subMonths(new Date(), 1)).toISOString();
  const selectedMonth = defaultMonth; // Changed from useState to const since it's never updated
  
  // Use the employer selection hook for proper context management
  const { selectedEmployerId, employers, isLoadingEmployers, handleEmployerChange } = useEmployerSelection();

  // Defer secondary widgets (metrics/charts) until incidents list finishes
  const [readyForSecondary, setReadyForSecondary] = useState(false);
  
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

  // Quick stats for super admin
  const quickStats = [
    { label: "Total Employers", value: employers.length, icon: Building2, color: "text-blue-600" },
    { label: "Active Incidents", value: "View All", icon: Activity, color: "text-orange-600" },
    { label: "System Health", value: "Optimal", icon: Shield, color: "text-green-600" },
    { label: "Total Users", value: "Manage", icon: Users, color: "text-purple-600" }
  ];

  return (
    <div className="min-h-screen bg-background">
      <MenuBar />
      <div className="pt-16 p-8">
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

          {/* Header with Super Admin badge */}
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-bold">Super Admin Dashboard</h1>
                <Badge className="bg-purple-600 text-white">SUPER ADMIN</Badge>
              </div>
              <p className="mt-2 text-muted-foreground">
                Complete system oversight and management capabilities
              </p>
            </div>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => navigate("/admin/users")}>
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

          {/* Employer Selector - Always visible for Super Admin */}
          <Card className="border-purple-200 bg-purple-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Context
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Select
                  value={selectedEmployerId?.toString() || "all"}
                  onValueChange={(value) => handleEmployerChange(value === "all" ? null : Number(value))}
                  disabled={isLoadingEmployers}
                >
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="Select employer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        View All Companies
                      </div>
                    </SelectItem>
                    {employers.map((employer) => (
                      <SelectItem key={employer.employer_id} value={employer.employer_id.toString()}>
                        {employer.employer_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">
                  {selectedEmployerId === null 
                    ? "Viewing data from all companies" 
                    : `Viewing data for ${employers.find(e => e.employer_id === selectedEmployerId)?.employer_name || 'selected company'}`}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats for Super Admin */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {quickStats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => {
                    if (stat.label === "Total Users") navigate("/admin/users");
                    if (stat.label === "Total Employers") navigate("/admin/employers");
                  }}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
                      <Icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Recent Incidents List */}
          <DataErrorBoundary errorTitle="Failed to load recent incidents">
            <IncidentsListOptimized 
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
              
              <DataErrorBoundary errorTitle="Failed to load performance overview">
                <PerformanceOverview selectedEmployerId={selectedEmployerId} />
              </DataErrorBoundary>
            </>
          )}
        </div>
      </div>
      {/* Debug component disabled to prevent memory leaks */}
      {/* <DebugPanel /> */}
    </div>
  );
};

export default SuperAdminDashboard;