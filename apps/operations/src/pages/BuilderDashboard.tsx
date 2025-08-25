import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, FileText, TrendingUp, AlertTriangle, Calendar, Shield, ClipboardList, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { useEmployerSelection } from "@/hooks/useEmployerSelection";
import { useEmployerContext } from "@/hooks/useEmployerContext";
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { EmployerSelector } from '@/components/builder/EmployerSelector';
import { useAuth } from "@/lib/auth/AuthContext";
import { IncidentsList } from '@/components/dashboard/IncidentsList';
import { useEffect } from 'react';

export default function BuilderDashboard() {
  const { userData } = useAuth();
  const { 
    selectedEmployerId, 
    employers, 
    isLoadingEmployers, 
    handleEmployerChange 
  } = useEmployerSelection();
  
  // Use the new context-aware hook for statistics
  const { 
    statistics: stats, 
    isLoadingStats,
    setContext,
    currentContext,
    incidents,
    isLoadingIncidents 
  } = useEmployerContext();
  
  // Sync employer selection with context
  useEffect(() => {
    if (selectedEmployerId && selectedEmployerId !== currentContext) {
      setContext(selectedEmployerId);
    }
  }, [selectedEmployerId, currentContext, setContext]);

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Builder Dashboard' }
  ];
  
  const isSuperAdmin = userData?.role_id === 1;
  
  // Custom actions for the header (employer selector for super admin)
  const headerActions = isSuperAdmin ? (
    <div className="flex items-center gap-2">
      <EmployerSelector
        employers={employers}
        selectedEmployerId={selectedEmployerId}
        onSelect={handleEmployerChange}
        isLoading={isLoadingEmployers}
      />
    </div>
  ) : null;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        title="Builder Dashboard"
        description="Manage workplace safety and incidents for your organization"
        breadcrumbItems={breadcrumbItems}
        customActions={headerActions}
      />

      {!selectedEmployerId ? (
        <div className="container mx-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle>Select an Employer</CardTitle>
              <CardDescription>
                Please select an employer from the dropdown above to view the dashboard.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      ) : isLoadingStats ? (
        <div className="container mx-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle>Loading...</CardTitle>
              <CardDescription>
                Fetching data for the selected employer...
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      ) : (
      
      <div className="container mx-auto p-6 space-y-6">

      {/* Current Company Banner */}
      {stats?.selected_employer_name && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Current Company</CardTitle>
              </div>
              <span className="text-sm text-muted-foreground">
                Company ID: {stats.selected_employer_id}
              </span>
            </div>
            <CardDescription className="text-base font-medium text-foreground">
              {stats.selected_employer_name}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.incident_count || 0}</div>
            <p className="text-xs text-muted-foreground">All time incidents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Workers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.worker_count || 0}</div>
            <p className="text-xs text-muted-foreground">Registered workers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Work Sites</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.site_count || 0}</div>
            <p className="text-xs text-muted-foreground">Active locations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Days Lost Average</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avg_days_lost ? Number(stats.avg_days_lost).toFixed(1) : '0'}</div>
            <p className="text-xs text-muted-foreground">Average days per incident</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Incident Management
            </CardTitle>
            <CardDescription>
              Report and manage workplace incidents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link to="/incident-report">
              <Button className="w-full">Report New Incident</Button>
            </Link>
            <Link to="/builder-senior">
              <Button variant="outline" className="w-full">View All Incidents</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              LTI Management
            </CardTitle>
            <CardDescription>
              Track Lost Time Injuries and recovery
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link to="/builder/senior/lti-details">
              <Button className="w-full">View LTI Details</Button>
            </Link>
            <Button variant="outline" className="w-full">Generate LTI Report</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Worker Management
            </CardTitle>
            <CardDescription>
              Manage your workforce and safety training
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full">Add New Worker</Button>
            <Button variant="outline" className="w-full">Training Records</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Site Management
            </CardTitle>
            <CardDescription>
              Manage work sites and safety protocols
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link to="/site-admin">
              <Button className="w-full">Manage Sites</Button>
            </Link>
            <Button variant="outline" className="w-full">Safety Inspections</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Analytics & Reports
            </CardTitle>
            <CardDescription>
              View safety metrics and generate reports
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full">Safety Dashboard</Button>
            <Button variant="outline" className="w-full">Monthly Reports</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Compliance Calendar
            </CardTitle>
            <CardDescription>
              Track safety audits and compliance deadlines
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full">View Calendar</Button>
            <Button variant="outline" className="w-full">Schedule Audit</Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Incidents List */}
      <IncidentsList 
        selectedEmployerId={selectedEmployerId}
        showActions={true}
        maxHeight="500px"
      />
    </div>
      )}
    </div>
  );
}