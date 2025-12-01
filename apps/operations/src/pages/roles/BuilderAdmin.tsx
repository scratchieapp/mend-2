import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEmployerContext } from "@/hooks/useEmployerContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, 
  Building2, 
  MapPin, 
  Users, 
  Clock,
  BarChart3,
  ChevronRight,
  Shield,
  AlertTriangle
} from "lucide-react";

const BuilderAdmin = () => {
  const navigate = useNavigate();
  const { selectedEmployerId, employers } = useEmployerContext();

  const selectedEmployer = employers?.find(e => e.employer_id === selectedEmployerId);

  // Fetch site count
  const { data: siteCount = 0 } = useQuery({
    queryKey: ['site-count', selectedEmployerId],
    queryFn: async () => {
      if (!selectedEmployerId) return 0;
      const { count } = await supabase
        .from('sites')
        .select('site_id', { count: 'exact', head: true })
        .eq('employer_id', selectedEmployerId);
      return count || 0;
    },
    enabled: !!selectedEmployerId,
  });

  // Fetch recent incidents count
  const { data: recentIncidents = 0 } = useQuery({
    queryKey: ['recent-incidents-count', selectedEmployerId],
    queryFn: async () => {
      if (!selectedEmployerId) return 0;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count } = await supabase
        .from('incidents')
        .select('incident_id', { count: 'exact', head: true })
        .eq('employer_id', selectedEmployerId)
        .gte('date_of_injury', thirtyDaysAgo.toISOString());
      return count || 0;
    },
    enabled: !!selectedEmployerId,
  });

  // Fetch worker count
  const { data: workerCount = 0 } = useQuery({
    queryKey: ['worker-count', selectedEmployerId],
    queryFn: async () => {
      if (!selectedEmployerId) return 0;
      const { count } = await supabase
        .from('workers')
        .select('worker_id', { count: 'exact', head: true })
        .eq('employer_id', selectedEmployerId);
      return count || 0;
    },
    enabled: !!selectedEmployerId,
  });

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-emerald-600" />
          <h1 className="text-3xl font-bold tracking-tight">Builder Admin Dashboard</h1>
        </div>
        <p className="text-muted-foreground">
          {selectedEmployer?.employer_name || 'Select a company'} - Company Overview
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sites</p>
                <p className="text-3xl font-bold">{siteCount}</p>
              </div>
              <MapPin className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Workers</p>
                <p className="text-3xl font-bold">{workerCount}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Incidents (30d)</p>
                <p className="text-3xl font-bold">{recentIncidents}</p>
              </div>
              <AlertTriangle className={`h-8 w-8 ${recentIncidents > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Reports</p>
                <p className="text-3xl font-bold">—</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Safety Reports Card */}
        <Card className="relative overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/reports')}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-full" />
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <BarChart3 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle>Safety Reports</CardTitle>
                <CardDescription>Generate AI-powered safety reports</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Create comprehensive reports with frequency rate analysis, incident breakdowns, and actionable recommendations.
            </p>
            <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              View Reports
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Hours Management Card */}
        <Card className="relative overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/hours-management')}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-full" />
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle>Hours Worked</CardTitle>
                <CardDescription>Manage site hours data</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Enter and track employee and subcontractor hours for accurate frequency rate calculations.
            </p>
            <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              Manage Hours
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Site Management Card */}
        <Card className="relative overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/admin/sites')}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-violet-500/10 to-transparent rounded-bl-full" />
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                <Building2 className="h-6 w-6 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <CardTitle>Site Management</CardTitle>
                <CardDescription>Configure sites and locations</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Add, edit, and manage your company's sites including jurisdictional information.
            </p>
            <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              Manage Sites
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Report Your Incidents */}
      <Card className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30 border-emerald-200 dark:border-emerald-800">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white dark:bg-background rounded-lg shadow-sm">
                <FileText className="h-8 w-8 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Report a New Incident</h3>
                <p className="text-sm text-muted-foreground">
                  Quickly log workplace incidents for tracking and analysis
                </p>
              </div>
            </div>
            <Button onClick={() => navigate('/incidents/new')}>
              New Incident
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BuilderAdmin;
