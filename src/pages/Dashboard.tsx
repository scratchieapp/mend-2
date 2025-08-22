import { MetricsCards } from "@/components/dashboard/MetricsCards";
import { IncidentAnalytics } from "@/components/dashboard/IncidentAnalytics";
import { PerformanceOverview } from "@/components/dashboard/PerformanceOverview";
import { MedicalProfessionalDashboard } from "@/components/dashboard/MedicalProfessionalDashboard";
import { IndustryLTIChart } from "@/components/dashboard/charts/IndustryLTIChart";
import { IncidentsList } from "@/components/dashboard/IncidentsList";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PlusCircle, Download, CheckCircle } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { MenuBar } from "@/components/MenuBar";
import { DataErrorBoundary } from "@/components/DataErrorBoundary";
import { useState, useEffect } from "react";
import { startOfMonth, subMonths } from "date-fns";

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentMode = localStorage.getItem("userMode") || "mend";
  const isMedicalProfessional = currentMode === "medical";
  
  // Get last month as the default month for metrics
  const defaultMonth = startOfMonth(subMonths(new Date(), 1)).toISOString();
  const [selectedMonth] = useState(defaultMonth);
  const [selectedEmployerId] = useState<number | null>(() => {
    const stored = localStorage.getItem("selectedEmployerId");
    return stored ? Number(stored) : null;
  });

  // Handle success state from incident submission
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [submittedIncidentId, setSubmittedIncidentId] = useState<number | null>(null);

  useEffect(() => {
    // Check if user just submitted an incident
    if (location.state?.justSubmittedIncident) {
      setShowSuccessMessage(true);
      setSubmittedIncidentId(location.state.incidentId || null);
      
      // Clear the state to prevent showing on refresh
      window.history.replaceState({}, document.title);
      
      // Auto-hide success message after 10 seconds
      const timer = setTimeout(() => {
        setShowSuccessMessage(false);
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  return (
    <div className="min-h-screen bg-background">
      <MenuBar />
      <div className="pt-16 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Success Message */}
          {showSuccessMessage && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>
                    Incident report submitted successfully!
                    {submittedIncidentId && ` Report ID: #${submittedIncidentId}`}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowSuccessMessage(false)}
                    className="text-green-600 hover:text-green-700"
                  >
                    Dismiss
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold">
                {isMedicalProfessional ? "Medical Professional Dashboard" : "Executive Dashboard"}
              </h1>
              <p className="mt-2 text-muted-foreground">
                {isMedicalProfessional 
                  ? "Manage and review assigned cases"
                  : "Strategic overview and key performance indicators"
                }
              </p>
            </div>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => {/* Generate report */}}>
                <Download className="mr-2 h-4 w-4" />
                Export Report
              </Button>
              <Button onClick={() => navigate("/incident-report")}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Record New Incident
              </Button>
            </div>
          </div>

          {isMedicalProfessional ? (
            <DataErrorBoundary errorTitle="Failed to load medical dashboard">
              <MedicalProfessionalDashboard />
            </DataErrorBoundary>
          ) : (
            <>
              {/* Recent Incidents List */}
              <DataErrorBoundary errorTitle="Failed to load recent incidents">
                <IncidentsList 
                  highlightIncidentId={submittedIncidentId || undefined}
                  showActions={true}
                  maxHeight="400px"
                />
              </DataErrorBoundary>

              <DataErrorBoundary errorTitle="Failed to load metrics">
                <MetricsCards selectedEmployerId={selectedEmployerId} selectedMonth={selectedMonth} />
              </DataErrorBoundary>
              
              <DataErrorBoundary errorTitle="Failed to load LTI chart">
                <IndustryLTIChart />
              </DataErrorBoundary>
              
              <DataErrorBoundary errorTitle="Failed to load incident analytics">
                <IncidentAnalytics />
              </DataErrorBoundary>
              
              <DataErrorBoundary errorTitle="Failed to load performance overview">
                <PerformanceOverview />
              </DataErrorBoundary>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;