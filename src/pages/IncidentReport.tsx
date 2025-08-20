import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataErrorBoundary } from "@/components/DataErrorBoundary";
import { LoadingState } from "@/components/ui/LoadingState";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft, ArrowRight, Save } from "lucide-react";

// Form sections
import { NotificationSection } from "@/components/incident-report/NotificationSection";
import { WorkerDetailsSection } from "@/components/incident-report/WorkerDetailsSection";
import { EmploymentSection } from "@/components/incident-report/EmploymentSection";
import { InjuryDetailsSection } from "@/components/incident-report/InjuryDetailsSection";
import { TreatmentDetailsSection } from "@/components/incident-report/TreatmentDetailsSection";
import { ActionsTakenSection } from "@/components/incident-report/ActionsTakenSection";
import { CaseNotesSection } from "@/components/incident-report/CaseNotesSection";
import { DocumentsSection } from "@/components/incident-report/DocumentsSection";

// Hooks and validation
import { useIncidentSubmission } from "@/components/incident-report/hooks/useIncidentSubmission";
import { incidentReportSchema, type IncidentReportFormData } from "@/lib/validations/incident";
import { logValidationError } from "@/lib/monitoring/errorLogger";

const IncidentReport = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("notification");
  const { handleSubmit: submitIncident, loading: isSubmitting } = useIncidentSubmission();

  const form = useForm<IncidentReportFormData>({
    resolver: zodResolver(incidentReportSchema),
    mode: 'onBlur', // Validate on blur for better UX
    defaultValues: {
      mend_client: "",
      notifying_person_name: "",
      notifying_person_position: "",
      notifying_person_telephone: "",
      worker_id: "",
      employer_name: "",
      location_site: "",
      supervisor_contact: "",
      supervisor_phone: "",
      employment_type: "full_time",
      date_of_injury: "",
      time_of_injury: "",
      injury_type: "",
      body_part: "",
      body_side: "not_applicable",
      injury_description: "",
      witness: "",
      type_of_first_aid: "",
      referred_to: "none",
      doctor_details: "",
      actions_taken: [],
      case_notes: "",
      documents: [],
    },
  });

  const { handleSubmit, formState: { errors, isValid, isDirty } } = form;

  const tabOrder = [
    { id: "notification", title: "Notification", required: true },
    { id: "worker", title: "Worker Details", required: true },
    { id: "employment", title: "Employment", required: true },
    { id: "injury", title: "Injury Details", required: true },
    { id: "treatment", title: "Treatment", required: true },
    { id: "actions", title: "Actions Taken", required: true },
    { id: "notes", title: "Case Notes", required: false },
    { id: "documents", title: "Documents", required: false },
  ];

  const currentTabIndex = tabOrder.findIndex(tab => tab.id === activeTab);
  const isFirstTab = currentTabIndex === 0;
  const isLastTab = currentTabIndex === tabOrder.length - 1;

  const handleNextTab = () => {
    if (!isLastTab) {
      setActiveTab(tabOrder[currentTabIndex + 1].id);
    }
  };

  const handlePrevTab = () => {
    if (!isFirstTab) {
      setActiveTab(tabOrder[currentTabIndex - 1].id);
    }
  };

  const onSubmit = async (data: IncidentReportFormData) => {
    try {
      await submitIncident(data);
    } catch (error) {
      // Error handling is done in the submission hook
      logValidationError('incident-report', errors);
    }
  };

  // Check if current tab has validation errors
  const currentTabHasErrors = () => {
    const tabErrorFields: Record<string, string[]> = {
      notification: ['mend_client', 'notifying_person_name', 'notifying_person_position', 'notifying_person_telephone'],
      worker: ['worker_id'],
      employment: ['employer_name', 'location_site', 'supervisor_contact', 'supervisor_phone', 'employment_type'],
      injury: ['date_of_injury', 'time_of_injury', 'injury_type', 'body_part', 'injury_description'],
      treatment: ['type_of_first_aid', 'referred_to'],
      actions: ['actions_taken'],
      notes: [], // No required fields
      documents: [], // No required fields
    };

    const fieldsForCurrentTab = tabErrorFields[activeTab] || [];
    return fieldsForCurrentTab.some(field => errors[field as keyof typeof errors]);
  };

  if (isSubmitting) {
    return <LoadingState fullScreen text="Submitting incident report..." size="lg" />;
  }

  return (
    <DataErrorBoundary errorTitle="Failed to load incident report form">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-2xl">Incident Report</CardTitle>
                  <p className="text-muted-foreground mt-1">
                    Report workplace incidents and injuries
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/dashboard")}
                  disabled={isSubmitting}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </div>

              {/* Progress indicator */}
              <div className="flex items-center space-x-2">
                {tabOrder.map((tab, index) => (
                  <div key={tab.id} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        index <= currentTabIndex
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <span className={`ml-2 text-sm ${
                      index <= currentTabIndex ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {tab.title}
                    </span>
                    {index < tabOrder.length - 1 && (
                      <div className={`w-8 h-0.5 mx-4 ${
                        index < currentTabIndex ? 'bg-primary' : 'bg-muted'
                      }`} />
                    )}
                  </div>
                ))}
              </div>

              {/* Validation errors summary */}
              {Object.keys(errors).length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Please fix the validation errors before proceeding:
                    <ul className="list-disc list-inside mt-2">
                      {Object.entries(errors).map(([field, error]) => (
                        <li key={field} className="text-sm">
                          {field}: {error?.message}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </CardHeader>

            <CardContent>
              <Form {...form}>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-8">
                      {tabOrder.map((tab) => (
                        <TabsTrigger
                          key={tab.id}
                          value={tab.id}
                          className="text-xs"
                          disabled={isSubmitting}
                        >
                          {tab.title}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    <TabsContent value="notification" className="space-y-4">
                      <DataErrorBoundary errorTitle="Failed to load notification section">
                        <NotificationSection form={form} />
                      </DataErrorBoundary>
                    </TabsContent>

                    <TabsContent value="worker" className="space-y-4">
                      <DataErrorBoundary errorTitle="Failed to load worker details">
                        <WorkerDetailsSection form={form} />
                      </DataErrorBoundary>
                    </TabsContent>

                    <TabsContent value="employment" className="space-y-4">
                      <DataErrorBoundary errorTitle="Failed to load employment section">
                        <EmploymentSection form={form} />
                      </DataErrorBoundary>
                    </TabsContent>

                    <TabsContent value="injury" className="space-y-4">
                      <DataErrorBoundary errorTitle="Failed to load injury details">
                        <InjuryDetailsSection form={form} />
                      </DataErrorBoundary>
                    </TabsContent>

                    <TabsContent value="treatment" className="space-y-4">
                      <DataErrorBoundary errorTitle="Failed to load treatment section">
                        <TreatmentDetailsSection form={form} />
                      </DataErrorBoundary>
                    </TabsContent>

                    <TabsContent value="actions" className="space-y-4">
                      <DataErrorBoundary errorTitle="Failed to load actions section">
                        <ActionsTakenSection form={form} />
                      </DataErrorBoundary>
                    </TabsContent>

                    <TabsContent value="notes" className="space-y-4">
                      <DataErrorBoundary errorTitle="Failed to load case notes">
                        <CaseNotesSection form={form} />
                      </DataErrorBoundary>
                    </TabsContent>

                    <TabsContent value="documents" className="space-y-4">
                      <DataErrorBoundary errorTitle="Failed to load documents section">
                        <DocumentsSection form={form} />
                      </DataErrorBoundary>
                    </TabsContent>
                  </Tabs>

                  {/* Navigation buttons */}
                  <div className="flex justify-between pt-6 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePrevTab}
                      disabled={isFirstTab || isSubmitting}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Previous
                    </Button>

                    <div className="flex space-x-2">
                      {!isLastTab ? (
                        <Button
                          type="button"
                          onClick={handleNextTab}
                          disabled={currentTabHasErrors() || isSubmitting}
                        >
                          Next
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          type="submit"
                          disabled={!isValid || !isDirty || isSubmitting}
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {isSubmitting ? 'Submitting...' : 'Submit Report'}
                        </Button>
                      )}
                    </div>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </DataErrorBoundary>
  );
};

export default IncidentReport;