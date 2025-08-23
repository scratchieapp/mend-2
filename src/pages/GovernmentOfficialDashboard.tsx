import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  TrendingUp, 
  AlertTriangle, 
  Shield, 
  Building2, 
  Calendar,
  BarChart3,
  ClipboardCheck,
  FileSearch,
  Gavel
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

export default function GovernmentOfficialDashboard() {
  const navigate = useNavigate();

  // Fetch regulatory statistics
  const { data: stats } = useQuery({
    queryKey: ['governmentStats'],
    queryFn: async () => {
      // Fetch all incidents for regulatory oversight
      const { data: incidents } = await supabase
        .from('incidents')
        .select('*');

      // Fetch all employers for compliance tracking
      const { data: employers } = await supabase
        .from('employers')
        .select('*');

      // Calculate statistics
      const totalIncidents = incidents?.length || 0;
      const severeIncidents = incidents?.filter(i => 
        i.severity === 'critical' || i.severity === 'major'
      ).length || 0;
      const lostTimeInjuries = incidents?.filter(i => i.lost_time_injury).length || 0;
      const companiesMonitored = employers?.length || 0;

      // Calculate compliance rate (placeholder)
      const complianceRate = 85; // Percentage

      return {
        totalIncidents,
        severeIncidents,
        lostTimeInjuries,
        companiesMonitored,
        complianceRate,
        openInvestigations: Math.floor(severeIncidents * 0.3),
        pendingReports: Math.floor(totalIncidents * 0.1),
      };
    },
  });

  // Fetch recent severe incidents for investigation
  const { data: severeIncidents } = useQuery({
    queryKey: ['severIncidentsGov'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select(`
          incident_id,
          incident_date,
          injury_type,
          body_part_injured,
          severity,
          status,
          investigation_notes,
          lost_time_injury,
          workers (
            first_name,
            last_name
          ),
          employers (
            employer_name,
            employer_id
          ),
          sites (
            site_name,
            city,
            state
          )
        `)
        .in('severity', ['critical', 'major'])
        .order('incident_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  // Fetch employer compliance data
  const { data: employerCompliance } = useQuery({
    queryKey: ['employerCompliance'],
    queryFn: async () => {
      const { data: employers } = await supabase
        .from('employers')
        .select('employer_id, employer_name');

      if (!employers) return [];

      // For each employer, get incident statistics
      const complianceData = await Promise.all(
        employers.slice(0, 5).map(async (employer) => {
          const { count: incidentCount } = await supabase
            .from('incidents')
            .select('*', { count: 'exact', head: true })
            .eq('employer_id', employer.employer_id);

          const { count: severeCount } = await supabase
            .from('incidents')
            .select('*', { count: 'exact', head: true })
            .eq('employer_id', employer.employer_id)
            .in('severity', ['critical', 'major']);

          // Calculate compliance score (placeholder algorithm)
          const baseScore = 100;
          const incidentPenalty = (incidentCount || 0) * 2;
          const severePenalty = (severeCount || 0) * 10;
          const complianceScore = Math.max(0, baseScore - incidentPenalty - severePenalty);

          return {
            ...employer,
            incidentCount: incidentCount || 0,
            severeCount: severeCount || 0,
            complianceScore,
          };
        })
      );

      return complianceData.sort((a, b) => a.complianceScore - b.complianceScore);
    },
  });

  const getSeverityBadge = (severity: string | null) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Critical - Investigation Required</Badge>;
      case 'major':
        return <Badge className="bg-orange-500">Major - Review Required</Badge>;
      case 'moderate':
        return <Badge className="bg-yellow-500">Moderate</Badge>;
      case 'minor':
        return <Badge variant="secondary">Minor</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getComplianceColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Government Regulatory Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Monitor workplace safety compliance and investigate incidents
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalIncidents || 0}</div>
            <p className="text-xs text-muted-foreground">Reported this year</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Severe Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats?.severeIncidents || 0}
            </div>
            <p className="text-xs text-muted-foreground">Critical & Major</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.complianceRate || 0}%</div>
            <Progress value={stats?.complianceRate || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Investigations</CardTitle>
            <FileSearch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.openInvestigations || 0}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSearch className="h-5 w-5" />
              Incident Investigation
            </CardTitle>
            <CardDescription>
              Investigate workplace incidents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full">Open Investigations</Button>
            <Button variant="outline" className="w-full">New Investigation</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Compliance Audits
            </CardTitle>
            <CardDescription>
              Conduct safety compliance audits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full">Schedule Audit</Button>
            <Button variant="outline" className="w-full">Audit Reports</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5" />
              Enforcement Actions
            </CardTitle>
            <CardDescription>
              Issue citations and penalties
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full">Issue Citation</Button>
            <Button variant="outline" className="w-full">Penalty History</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Statistical Analysis
            </CardTitle>
            <CardDescription>
              Industry safety trends
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full">Trend Analysis</Button>
            <Button variant="outline" className="w-full">Industry Comparison</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Monitoring
            </CardTitle>
            <CardDescription>
              Track company compliance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full">Company List</Button>
            <Button variant="outline" className="w-full">Risk Assessment</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Regulatory Calendar
            </CardTitle>
            <CardDescription>
              Compliance deadlines and events
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full">View Calendar</Button>
            <Button variant="outline" className="w-full">Add Deadline</Button>
          </CardContent>
        </Card>
      </div>

      {/* Severe Incidents Requiring Investigation */}
      <Card>
        <CardHeader>
          <CardTitle>Severe Incidents Requiring Investigation</CardTitle>
          <CardDescription>Critical and major incidents that may require regulatory action</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Worker</TableHead>
                <TableHead>Injury</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {severeIncidents?.map((incident) => (
                <TableRow key={incident.incident_id}>
                  <TableCell>
                    {format(new Date(incident.incident_date), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="font-medium">
                    {incident.employers?.employer_name}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{incident.sites?.site_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {incident.sites?.city}, {incident.sites?.state}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {incident.workers?.first_name} {incident.workers?.last_name}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{incident.injury_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {incident.body_part_injured}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{getSeverityBadge(incident.severity)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/incident/${incident.incident_id}`)}
                      >
                        Review
                      </Button>
                      <Button size="sm" variant="destructive">Investigate</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Company Compliance Rankings */}
      <Card>
        <CardHeader>
          <CardTitle>Company Compliance Rankings</CardTitle>
          <CardDescription>Companies with lowest compliance scores requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead className="text-center">Total Incidents</TableHead>
                <TableHead className="text-center">Severe Incidents</TableHead>
                <TableHead className="text-center">Compliance Score</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employerCompliance?.map((employer) => (
                <TableRow key={employer.employer_id}>
                  <TableCell className="font-medium">
                    {employer.employer_name}
                  </TableCell>
                  <TableCell className="text-center">
                    {employer.incidentCount}
                  </TableCell>
                  <TableCell className="text-center">
                    {employer.severeCount > 0 && (
                      <Badge variant="destructive">{employer.severeCount}</Badge>
                    )}
                    {employer.severeCount === 0 && <span className="text-muted-foreground">0</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`font-bold ${getComplianceColor(employer.complianceScore)}`}>
                      {employer.complianceScore}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant={employer.complianceScore < 60 ? "destructive" : "outline"}>
                      {employer.complianceScore < 60 ? "Audit Required" : "Review"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}