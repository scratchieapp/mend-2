import { useEffect, useState } from "react";
import { useClerkAuthContext } from "@/lib/clerk/ClerkAuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Calendar,
  User,
  Building,
  MapPin,
  Phone,
  Mail,
  ChevronRight
} from "lucide-react";
import { format } from "date-fns";

interface WorkerInfo {
  worker_id: number;
  given_name: string;
  family_name: string;
  email: string;
  phone_number: string;
  employer: {
    employer_name: string;
  };
}

interface IncidentRecord {
  incident_id: string;
  incident_date: string;
  time_of_incident: string;
  injury_description: string;
  incident_status: string;
  created_at: string;
  site: {
    site_name: string;
    site_address: string;
  };
  claim_status?: string;
  return_to_work_date?: string;
  medical_provider?: string;
  next_appointment?: string;
}

const WorkerPortal = () => {
  const { user, isLoading: authLoading } = useClerkAuthContext();
  const [workerInfo, setWorkerInfo] = useState<WorkerInfo | null>(null);
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (user?.email && !authLoading) {
      fetchWorkerData();
    }
  }, [user, authLoading]);

  const fetchWorkerData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch worker information
      const { data: workerData, error: workerError } = await supabase
        .from("workers")
        .select(`
          worker_id,
          given_name,
          family_name,
          email,
          phone_number,
          employer:employers(employer_name)
        `)
        .eq("email", user?.email)
        .single();

      if (workerError) {
        throw new Error("Unable to find worker information");
      }

      setWorkerInfo(workerData);

      // Fetch incidents for this worker
      const { data: incidentData, error: incidentError } = await supabase
        .from("incidents")
        .select(`
          incident_id,
          incident_date,
          time_of_incident,
          injury_description,
          incident_status,
          created_at,
          site:sites(site_name, site_address)
        `)
        .eq("worker_id", workerData.worker_id)
        .order("incident_date", { ascending: false });

      if (incidentError) {
        console.error("Error fetching incidents:", incidentError);
      } else {
        // Mock claim status data for demonstration
        const incidentsWithClaims = (incidentData || []).map(incident => ({
          ...incident,
          claim_status: getRandomClaimStatus(),
          return_to_work_date: Math.random() > 0.5 ? getFutureDate() : undefined,
          medical_provider: Math.random() > 0.3 ? "Sydney Medical Centre" : undefined,
          next_appointment: Math.random() > 0.4 ? getFutureDate() : undefined,
        }));
        setIncidents(incidentsWithClaims);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getRandomClaimStatus = () => {
    const statuses = ["Pending", "Approved", "Under Review", "Closed"];
    return statuses[Math.floor(Math.random() * statuses.length)];
  };

  const getFutureDate = () => {
    const days = Math.floor(Math.random() * 30) + 1;
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "approved":
      case "closed":
        return "bg-green-100 text-green-800";
      case "pending":
      case "under review":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "approved":
      case "closed":
        return <CheckCircle className="h-4 w-4" />;
      case "pending":
      case "under review":
        return <Clock className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!workerInfo) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Worker Profile Found</AlertTitle>
          <AlertDescription>
            Your worker profile could not be found. Please contact your administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const activeIncidents = incidents.filter(i => i.claim_status !== "Closed");
  const closedIncidents = incidents.filter(i => i.claim_status === "Closed");

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      {/* Header Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-2xl">
                Welcome, {workerInfo.given_name} {workerInfo.family_name}
              </CardTitle>
              <CardDescription className="mt-2">
                View your incident reports, claim status, and return-to-work information
              </CardDescription>
            </div>
            <Button className="mt-4 md:mt-0">
              <FileText className="mr-2 h-4 w-4" />
              Report New Incident
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Employer:</span>
              <span className="font-medium">{workerInfo.employer?.employer_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium">{workerInfo.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Phone:</span>
              <span className="font-medium">{workerInfo.phone_number}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="active">Active Claims ({activeIncidents.length})</TabsTrigger>
          <TabsTrigger value="history">History ({closedIncidents.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Total Incidents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{incidents.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Lifetime incident reports
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Active Claims</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeIncidents.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Currently being processed
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Next Appointment</CardTitle>
              </CardHeader>
              <CardContent>
                {incidents.find(i => i.next_appointment) ? (
                  <>
                    <div className="text-lg font-bold">
                      {format(new Date(incidents.find(i => i.next_appointment)!.next_appointment!), "MMM d")}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {incidents.find(i => i.next_appointment)?.medical_provider}
                    </p>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">No upcoming appointments</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Incidents */}
          {incidents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Incidents</CardTitle>
                <CardDescription>Your most recent incident reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {incidents.slice(0, 3).map((incident) => (
                    <IncidentCard key={incident.incident_id} incident={incident} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {activeIncidents.length > 0 ? (
            activeIncidents.map((incident) => (
              <IncidentCard key={incident.incident_id} incident={incident} detailed />
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-lg font-medium">No Active Claims</p>
                <p className="text-sm text-muted-foreground mt-2">
                  You don't have any active claims at the moment
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {closedIncidents.length > 0 ? (
            closedIncidents.map((incident) => (
              <IncidentCard key={incident.incident_id} incident={incident} />
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium">No Closed Claims</p>
                <p className="text-sm text-muted-foreground mt-2">
                  You don't have any closed claims in your history
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Incident Card Component
const IncidentCard = ({ incident, detailed = false }: { incident: IncidentRecord; detailed?: boolean }) => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-base">
                  Incident #{incident.incident_id.slice(0, 8)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {format(new Date(incident.incident_date), "MMMM d, yyyy")} at {incident.time_of_incident}
                </p>
              </div>
              {incident.claim_status && (
                <Badge className={`${getStatusColor(incident.claim_status)} flex items-center gap-1`}>
                  {getStatusIcon(incident.claim_status)}
                  {incident.claim_status}
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">{incident.site?.site_name}</p>
                  <p className="text-muted-foreground">{incident.site?.site_address}</p>
                </div>
              </div>

              <div className="text-sm">
                <span className="font-medium">Injury: </span>
                <span className="text-muted-foreground">{incident.injury_description}</span>
              </div>
            </div>

            {detailed && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t">
                {incident.return_to_work_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Return to work:</span>
                    <span className="font-medium">
                      {format(new Date(incident.return_to_work_date), "MMM d, yyyy")}
                    </span>
                  </div>
                )}
                {incident.medical_provider && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Provider:</span>
                    <span className="font-medium">{incident.medical_provider}</span>
                  </div>
                )}
                {incident.next_appointment && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Next appointment:</span>
                    <span className="font-medium">
                      {format(new Date(incident.next_appointment), "MMM d, yyyy")}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <Button variant="ghost" size="sm" className="mt-2 md:mt-0">
            View Details
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkerPortal;