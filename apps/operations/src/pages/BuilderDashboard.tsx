import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, FileText, TrendingUp, AlertTriangle, Calendar, Shield, ClipboardList } from "lucide-react";
import { Link } from "react-router-dom";
import { useEmployerSelection } from "@/hooks/useEmployerSelection";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardHeader } from '@/components/layout/DashboardHeader';

export default function BuilderDashboard() {
  const { selectedEmployerId } = useEmployerSelection();

  // Fetch statistics for the selected employer
  const { data: stats } = useQuery({
    queryKey: ['builderStats', selectedEmployerId],
    queryFn: async () => {
      if (!selectedEmployerId) return null;
      
      // Fetch incident count
      const { count: incidentCount } = await supabase
        .from('incidents')
        .select('*', { count: 'exact', head: true })
        .eq('employer_id', selectedEmployerId);

      // Fetch worker count
      const { count: workerCount } = await supabase
        .from('workers')
        .select('*', { count: 'exact', head: true })
        .eq('employer_id', selectedEmployerId);

      // Fetch site count
      const { count: siteCount } = await supabase
        .from('sites')
        .select('*', { count: 'exact', head: true })
        .eq('employer_id', selectedEmployerId);

      return {
        incidents: incidentCount || 0,
        workers: workerCount || 0,
        sites: siteCount || 0,
      };
    },
    enabled: !!selectedEmployerId,
  });

  if (!selectedEmployerId) {
    return (
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
    );
  }

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Builder Dashboard' }
  ];

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        title="Builder Dashboard"
        description="Manage workplace safety and incidents for your organization"
        breadcrumbItems={breadcrumbItems}
      />
      
      <div className="container mx-auto p-6 space-y-6">

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.incidents || 0}</div>
            <p className="text-xs text-muted-foreground">All time incidents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Workers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.workers || 0}</div>
            <p className="text-xs text-muted-foreground">Registered workers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Work Sites</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.sites || 0}</div>
            <p className="text-xs text-muted-foreground">Active locations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Safety Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">85%</div>
            <p className="text-xs text-muted-foreground">Compliance rating</p>
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

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest incidents and updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">New incident reported at Site A</p>
                <p className="text-xs text-muted-foreground">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <Shield className="h-5 w-5 text-green-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Safety audit completed at Site B</p>
                <p className="text-xs text-muted-foreground">1 day ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">5 new workers added to the system</p>
                <p className="text-xs text-muted-foreground">2 days ago</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </div>
  );
}