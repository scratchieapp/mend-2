import { Button } from "@/components/ui/button";
import { PlusCircle, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { IncidentsList } from "@/components/dashboard/IncidentsList";
import { IncidentsChart } from "@/components/incidents/IncidentsChart";
import { useEmployerContext } from "@/hooks/useEmployerContext";
import { useAuth } from "@/lib/auth/AuthContext";

export default function IncidentsPage() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { selectedEmployerId: contextEmployerId } = useEmployerContext();
  
  // Use employer context for appropriate roles
  const employerId = contextEmployerId || (userData?.employer_id ? parseInt(userData.employer_id) : null);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Incidents</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all workplace incidents
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
          <Button 
            className="gap-2"
            onClick={() => navigate('/incident-report?new=true')}
          >
            <PlusCircle className="h-4 w-4" />
            Record New Incident
          </Button>
        </div>
      </div>

      {/* Incidents Chart */}
      <IncidentsChart employerId={employerId} />

      {/* Incidents List */}
      <IncidentsList 
        selectedEmployerId={employerId}
        maxHeight="calc(100vh - 550px)"
      />
    </div>
  );
}

