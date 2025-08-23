import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { Search, User, Calendar, AlertCircle, Activity, FileText, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

export default function MedicalPatientsPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");

  // Fetch patients (workers with medical incidents)
  const { data: patients, isLoading } = useQuery({
    queryKey: ['medicalPatients', statusFilter, severityFilter],
    queryFn: async () => {
      let query = supabase
        .from('incidents')
        .select(`
          incident_id,
          incident_date,
          injury_type,
          body_part_injured,
          medical_attention_required,
          lost_time_injury,
          status,
          severity,
          treatment_type,
          return_to_work_date,
          medical_provider,
          workers!inner (
            worker_id,
            first_name,
            last_name,
            date_of_birth,
            telephone,
            email
          ),
          employers (
            employer_name
          ),
          sites (
            site_name
          )
        `)
        .eq('medical_attention_required', true)
        .order('incident_date', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (severityFilter !== 'all') {
        query = query.eq('severity', severityFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Filter patients based on search term
  const filteredPatients = patients?.filter(patient => {
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${patient.workers?.first_name} ${patient.workers?.last_name}`.toLowerCase();
    const injuryType = patient.injury_type?.toLowerCase() || '';
    const bodyPart = patient.body_part_injured?.toLowerCase() || '';
    
    return fullName.includes(searchLower) || 
           injuryType.includes(searchLower) || 
           bodyPart.includes(searchLower);
  });

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
        return <Badge className="bg-blue-500">In Treatment</Badge>;
      case 'closed':
        return <Badge variant="secondary">Recovered</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Patient Management</h1>
        <p className="text-muted-foreground mt-2">
          View and manage all workers receiving medical treatment
        </p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search Patients</CardTitle>
          <CardDescription>Find patients by name, injury type, or body part</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Active</SelectItem>
                <SelectItem value="in_progress">In Treatment</SelectItem>
                <SelectItem value="closed">Recovered</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="major">Major</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="minor">Minor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patients?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Cases</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {patients?.filter(p => p.status === 'open').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Treatment</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {patients?.filter(p => p.status === 'in_progress').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lost Time Injuries</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {patients?.filter(p => p.lost_time_injury).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Patients Table */}
      <Card>
        <CardHeader>
          <CardTitle>Patient List</CardTitle>
          <CardDescription>
            {filteredPatients?.length || 0} patients found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading patients...</div>
          ) : filteredPatients && filteredPatients.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Injury Details</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Employer/Site</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.map((patient) => (
                  <TableRow key={patient.incident_id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {patient.workers?.first_name} {patient.workers?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {patient.workers?.telephone}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{patient.injury_type}</p>
                        <p className="text-sm text-muted-foreground">
                          {patient.body_part_injured}
                        </p>
                        {patient.treatment_type && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Treatment: {patient.treatment_type}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p>{format(new Date(patient.incident_date), 'MMM dd, yyyy')}</p>
                        {patient.return_to_work_date && (
                          <p className="text-xs text-muted-foreground">
                            RTW: {format(new Date(patient.return_to_work_date), 'MMM dd')}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{patient.employers?.employer_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {patient.sites?.site_name}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{getSeverityBadge(patient.severity)}</TableCell>
                    <TableCell>{getStatusBadge(patient.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/incident/${patient.incident_id}`)}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => navigate(`/incident/${patient.incident_id}/edit`)}
                        >
                          Treat
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No patients found matching your criteria
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}