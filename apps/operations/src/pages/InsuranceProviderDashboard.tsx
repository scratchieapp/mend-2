import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  FileText, 
  TrendingUp, 
  AlertTriangle, 
  Shield, 
  Users, 
  Calendar,
  Calculator
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

export default function InsuranceProviderDashboard() {
  const navigate = useNavigate();

  // Fetch insurance statistics
  const { data: stats } = useQuery({
    queryKey: ['insuranceStats'],
    queryFn: async () => {
      // Fetch all incidents with potential claims
      const { data: incidents, error } = await supabase
        .from('incidents')
        .select('*')
        .eq('medical_attention_required', true);

      if (error) throw error;

      // Calculate statistics
      const totalClaims = incidents?.length || 0;
      const activeClaims = incidents?.filter(i => i.status === 'open').length || 0;
      const pendingReview = incidents?.filter(i => i.status === 'in_progress').length || 0;
      const closedClaims = incidents?.filter(i => i.status === 'closed').length || 0;

      // Calculate estimated costs (placeholder values)
      const estimatedCosts = totalClaims * 5000; // Average claim cost
      const paidOut = closedClaims * 4500;
      const pending = activeClaims * 5000;

      return {
        totalClaims,
        activeClaims,
        pendingReview,
        closedClaims,
        estimatedCosts,
        paidOut,
        pending,
      };
    },
  });

  // Fetch recent claims
  const { data: recentClaims } = useQuery({
    queryKey: ['recentInsuranceClaims'],
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
          medical_attention_required,
          lost_time_injury,
          workers (
            first_name,
            last_name
          ),
          employers (
            employer_name
          ),
          sites (
            site_name
          )
        `)
        .eq('medical_attention_required', true)
        .order('incident_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  const getClaimAmount = (severity: string | null, lostTime: boolean) => {
    // Placeholder calculation for claim amounts
    let base = 2000;
    if (severity === 'critical') base = 15000;
    else if (severity === 'major') base = 8000;
    else if (severity === 'moderate') base = 4000;
    
    if (lostTime) base *= 1.5;
    
    return base;
  };

  const getSeverityBadge = (severity: string | null) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'major':
        return <Badge className="bg-orange-500">Major</Badge>;
      case 'moderate':
        return <Badge className="bg-yellow-500">Moderate</Badge>;
      case 'minor':
        return <Badge variant="secondary">Minor</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'open':
        return <Badge variant="destructive">Active</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500">Under Review</Badge>;
      case 'closed':
        return <Badge variant="secondary">Settled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Insurance Provider Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage workplace injury claims and compensation
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Claims</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalClaims || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Claims</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeClaims || 0}</div>
            <p className="text-xs text-muted-foreground">Requiring attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid Out</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(stats?.paidOut || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Settled claims</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(stats?.pending || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Estimated liability</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Claims Management
            </CardTitle>
            <CardDescription>
              Review and process injury claims
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full">Review Pending Claims</Button>
            <Button variant="outline" className="w-full">Claim History</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Risk Assessment
            </CardTitle>
            <CardDescription>
              Analyze workplace risk factors
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full">Risk Analysis</Button>
            <Button variant="outline" className="w-full">Premium Calculator</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Analytics & Reports
            </CardTitle>
            <CardDescription>
              Claims trends and insights
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full">Claims Analytics</Button>
            <Button variant="outline" className="w-full">Generate Reports</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Policy Management
            </CardTitle>
            <CardDescription>
              Manage insurance policies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full">Active Policies</Button>
            <Button variant="outline" className="w-full">Policy Documents</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Client Management
            </CardTitle>
            <CardDescription>
              Manage insured companies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full">Client List</Button>
            <Button variant="outline" className="w-full">Premium Status</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Compliance
            </CardTitle>
            <CardDescription>
              Regulatory compliance tracking
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full">Compliance Check</Button>
            <Button variant="outline" className="w-full">Audit Trail</Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Claims Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Claims</CardTitle>
          <CardDescription>Latest workplace injury claims requiring review</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Claim Date</TableHead>
                <TableHead>Worker</TableHead>
                <TableHead>Employer</TableHead>
                <TableHead>Injury</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Est. Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentClaims?.map((claim) => (
                <TableRow key={claim.incident_id}>
                  <TableCell>
                    {format(new Date(claim.incident_date), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    {claim.workers?.first_name} {claim.workers?.last_name}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{claim.employers?.employer_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {claim.sites?.site_name}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{claim.injury_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {claim.body_part_injured}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{getSeverityBadge(claim.severity)}</TableCell>
                  <TableCell className="font-medium">
                    ${getClaimAmount(claim.severity, claim.lost_time_injury || false).toLocaleString()}
                  </TableCell>
                  <TableCell>{getStatusBadge(claim.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/incident/${claim.incident_id}`)}
                      >
                        Review
                      </Button>
                      <Button size="sm">Process</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {(!recentClaims || recentClaims.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              No recent claims to display
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}