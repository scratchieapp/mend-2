import { MetricsCards } from "@/components/dashboard/MetricsCards";
import { IncidentAnalytics } from "@/components/dashboard/IncidentAnalytics";
import { PerformanceOverview } from "@/components/dashboard/PerformanceOverview";
import { MedicalProfessionalDashboard } from "@/components/dashboard/MedicalProfessionalDashboard";
import { IndustryLTIChart } from "@/components/dashboard/charts/IndustryLTIChart";
import { Button } from "@/components/ui/button";
import { PlusCircle, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MenuBar } from "@/components/MenuBar";
import { DataErrorBoundary } from "@/components/DataErrorBoundary";
import { useState } from "react";
import { startOfMonth, subMonths } from "date-fns";

const Dashboard = () => {
  const navigate = useNavigate();
  const currentMode = localStorage.getItem("userMode") || "mend";
  const isMedicalProfessional = currentMode === "medical";
  
  // Get last month as the default month for metrics
  const defaultMonth = startOfMonth(subMonths(new Date(), 1)).toISOString();
  const [selectedMonth] = useState(defaultMonth);
  const [selectedEmployerId] = useState<number | null>(() => {
    const stored = localStorage.getItem("selectedEmployerId");
    return stored ? Number(stored) : null;
  });

  return (
    <div className="min-h-screen bg-background">
      <MenuBar />
      <div className="pt-16 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
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