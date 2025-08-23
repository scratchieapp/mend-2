import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Users, FileText, Calendar, Activity, Clock, Stethoscope, Pill } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export default function MedicalHomePage() {
  // Fetch medical statistics
  const { data: stats } = useQuery({
    queryKey: ['medicalStats'],
    queryFn: async () => {
      // Fetch active cases (incidents with medical attention needed)
      const { count: activeCases } = await supabase
        .from('incidents')
        .select('*', { count: 'exact', head: true })
        .eq('medical_attention_required', true)
        .eq('status', 'open');

      // Fetch total patients
      const { count: totalPatients } = await supabase
        .from('incidents')
        .select('*', { count: 'exact', head: true })
        .eq('medical_attention_required', true);

      // Fetch today's appointments (placeholder for future implementation)
      const todayAppointments = 5;

      // Fetch pending reviews
      const { count: pendingReviews } = await supabase
        .from('incidents')
        .select('*', { count: 'exact', head: true })
        .eq('medical_attention_required', true)
        .is('medical_review_completed', false);

      return {
        activeCases: activeCases || 0,
        totalPatients: totalPatients || 0,
        todayAppointments,
        pendingReviews: pendingReviews || 0,
      };
    },
  });

  // Fetch recent medical cases
  const { data: recentCases } = useQuery({
    queryKey: ['recentMedicalCases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select(`
          incident_id,
          incident_date,
          injury_type,
          body_part_injured,
          status,
          workers (
            first_name,
            last_name
          )
        `)
        .eq('medical_attention_required', true)
        .order('incident_date', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Medical Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage patient care and medical cases for workplace injuries
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Cases</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeCases || 0}</div>
            <p className="text-xs text-muted-foreground">Requiring attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalPatients || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.todayAppointments || 0}</div>
            <p className="text-xs text-muted-foreground">Scheduled visits</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingReviews || 0}</div>
            <p className="text-xs text-muted-foreground">Awaiting assessment</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Patient Management
            </CardTitle>
            <CardDescription>
              View and manage injured workers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link to="/medical/patients">
              <Button className="w-full">View All Patients</Button>
            </Link>
            <Link to="/medical-dashboard">
              <Button variant="outline" className="w-full">Active Cases</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Medical Assessments
            </CardTitle>
            <CardDescription>
              Conduct and review medical evaluations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full">New Assessment</Button>
            <Button variant="outline" className="w-full">Review Queue</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Treatment Plans
            </CardTitle>
            <CardDescription>
              Create and manage treatment protocols
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full">Create Treatment Plan</Button>
            <Button variant="outline" className="w-full">Active Plans</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5" />
              Medication Tracking
            </CardTitle>
            <CardDescription>
              Monitor prescribed medications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full">Prescriptions</Button>
            <Button variant="outline" className="w-full">Drug Interactions</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Return to Work
            </CardTitle>
            <CardDescription>
              Assess fitness for duty
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full">RTW Assessments</Button>
            <Button variant="outline" className="w-full">Clearance Forms</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Appointments
            </CardTitle>
            <CardDescription>
              Schedule and manage appointments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full">Schedule Appointment</Button>
            <Button variant="outline" className="w-full">Today's Schedule</Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Cases */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Medical Cases</CardTitle>
          <CardDescription>Latest workplace injury cases requiring medical attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentCases?.map((incident) => (
              <div key={incident.incident_id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {incident.workers?.first_name} {incident.workers?.last_name}
                    </p>
                    <Badge variant={incident.status === 'open' ? 'destructive' : 'secondary'}>
                      {incident.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {incident.injury_type} - {incident.body_part_injured}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(incident.incident_date).toLocaleDateString()}
                  </p>
                </div>
                <Button variant="outline" size="sm">View Details</Button>
              </div>
            ))}
            {(!recentCases || recentCases.length === 0) && (
              <p className="text-center text-muted-foreground py-4">No recent medical cases</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Appointments */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Appointments</CardTitle>
          <CardDescription>Scheduled patient visits for today</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">John Smith</p>
                <p className="text-sm text-muted-foreground">Follow-up - Back injury</p>
                <p className="text-xs text-muted-foreground">9:00 AM</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">Reschedule</Button>
                <Button size="sm">Start Visit</Button>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Sarah Johnson</p>
                <p className="text-sm text-muted-foreground">Initial Assessment - Hand injury</p>
                <p className="text-xs text-muted-foreground">10:30 AM</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">Reschedule</Button>
                <Button size="sm">Start Visit</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}