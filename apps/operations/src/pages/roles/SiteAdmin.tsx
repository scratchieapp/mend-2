import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, 
  MapPin, 
  Users, 
  Clock,
  BarChart3,
  ChevronRight,
  Shield,
  AlertTriangle,
  ClipboardList
} from "lucide-react";

const SiteAdmin = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();

  // Get site ID from user data
  const siteId = userData?.site_id ? parseInt(userData.site_id) : null;

  // Fetch site details
  const { data: site } = useQuery({
    queryKey: ['site-details', siteId],
    queryFn: async () => {
      if (!siteId) return null;
      const { data, error } = await supabase
        .from('sites')
        .select(`
          site_id,
          site_name,
          state,
          employer_id,
          employers (employer_name)
        `)
        .eq('site_id', siteId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!siteId,
  });

  // Fetch recent incidents count for this site
  const { data: recentIncidents = 0 } = useQuery({
    queryKey: ['site-incidents-count', siteId],
    queryFn: async () => {
      if (!siteId) return 0;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count } = await supabase
        .from('incidents')
        .select('incident_id', { count: 'exact', head: true })
        .eq('site_id', siteId)
        .gte('date_of_injury', thirtyDaysAgo.toISOString());
      return count || 0;
    },
    enabled: !!siteId,
  });

  // Fetch worker count for this site
  const { data: workerCount = 0 } = useQuery({
    queryKey: ['site-worker-count', siteId],
    queryFn: async () => {
      if (!siteId) return 0;
      // Workers are typically associated with employer, not site
      // This is a simplified query
      const { count } = await supabase
        .from('workers')
        .select('worker_id', { count: 'exact', head: true })
        .eq('site_id', siteId);
      return count || 0;
    },
    enabled: !!siteId,
  });

  // Check if hours are logged for current month
  const { data: hasCurrentHours } = useQuery({
    queryKey: ['site-hours-status', siteId],
    queryFn: async () => {
      if (!siteId) return false;
      const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
      
      const { data } = await supabase
        .from('hours_worked')
        .select('id')
        .eq('site_id', siteId)
        .eq('month', currentMonth)
        .maybeSingle();
      
      return !!data;
    },
    enabled: !!siteId,
  });

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-blue-600" />
          <h1 className="text-3xl font-bold tracking-tight">Site Admin Dashboard</h1>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>{site?.site_name || 'Loading...'}</span>
          {site?.state && <span className="text-xs">({site.state})</span>}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
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
                <p className="text-sm font-medium text-muted-foreground">Hours Status</p>
                <p className="text-lg font-semibold">
                  {hasCurrentHours ? (
                    <span className="text-emerald-600">Up to date</span>
                  ) : (
                    <span className="text-amber-600">Needs update</span>
                  )}
                </p>
              </div>
              <Clock className={`h-8 w-8 ${hasCurrentHours ? 'text-emerald-500' : 'text-amber-500'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hours Warning */}
      {!hasCurrentHours && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200">Hours data needed</p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Enter this month's hours to generate accurate safety reports
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={() => navigate('/hours-management')}>
                Enter Hours
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Safety Reports Card */}
        <Card className="relative overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => siteId && navigate(`/reports/site/${siteId}`)}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-full" />
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <BarChart3 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle>Site Safety Report</CardTitle>
                <CardDescription>Generate your site's safety report</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              View frequency rates, incident analysis, and AI-generated recommendations for your site.
            </p>
            <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              View Report
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
                <CardDescription>Update site hours data</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Enter employee and subcontractor hours for accurate frequency rate calculations.
            </p>
            <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              Manage Hours
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Report New Incident */}
      <Card className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30 border-emerald-200 dark:border-emerald-800">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white dark:bg-background rounded-lg shadow-sm">
                <ClipboardList className="h-8 w-8 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Report a New Incident</h3>
                <p className="text-sm text-muted-foreground">
                  Log workplace incidents for this site
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

      {/* Recent Incidents List */}
      {recentIncidents > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Recent Incidents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="link" className="p-0" onClick={() => navigate('/incidents')}>
              View all {recentIncidents} recent incident{recentIncidents !== 1 ? 's' : ''}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SiteAdmin;
