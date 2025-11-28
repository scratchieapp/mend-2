import { MedicalProfessionalDashboard } from "@/components/dashboard/MedicalProfessionalDashboard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataErrorBoundary } from "@/components/DataErrorBoundary";
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { Stethoscope, FileText, Calendar, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function MedicalDashboard() {
  const navigate = useNavigate();

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Medical Dashboard' }
  ];

  const customActions = (
    <div className="flex gap-4">
      <Button variant="outline" onClick={() => navigate("/medical-reports")}>
        <FileText className="mr-2 h-4 w-4" />
        Medical Reports
      </Button>
      <Button onClick={() => navigate("/incident-report?new=true")}>
        <Activity className="mr-2 h-4 w-4" />
        New Assessment
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        title="Medical Professional Dashboard"
        description="Manage patient cases, review incident reports, and track medical assessments"
        breadcrumbItems={breadcrumbItems}
        customActions={customActions}
      />
      
      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Active Cases</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">3 urgent</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8</div>
                <p className="text-xs text-muted-foreground">Due this week</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">5</div>
                <p className="text-xs text-muted-foreground">+2 from yesterday</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Follow-ups</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">15</div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Dashboard Content */}
          <DataErrorBoundary errorTitle="Failed to load medical dashboard">
            <MedicalProfessionalDashboard />
          </DataErrorBoundary>

          {/* Additional Medical Tools */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and tools for medical professionals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button variant="outline" className="h-20 flex-col gap-2">
                  <Calendar className="h-6 w-6" />
                  <span className="text-xs">Schedule Follow-up</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col gap-2">
                  <FileText className="h-6 w-6" />
                  <span className="text-xs">Medical Forms</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col gap-2">
                  <Activity className="h-6 w-6" />
                  <span className="text-xs">Treatment Plans</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col gap-2">
                  <Stethoscope className="h-6 w-6" />
                  <span className="text-xs">Consultations</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}