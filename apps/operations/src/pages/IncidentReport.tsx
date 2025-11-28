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
import { AlertCircle, ArrowLeft, ArrowRight, Save, FileText, Clock } from "lucide-react";

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
import { useAutoSaveDraft } from "@/hooks/useAutoSaveDraft";
import { incidentReportSchema, type IncidentReportFormData } from "@/lib/validations/incident";
import { logValidationError } from "@/lib/monitoring/errorLogger";

const IncidentReport = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("notification");
  const { handleSubmit: submitIncident, loading: isSubmitting, SuccessDialog } = useIncidentSubmission();

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

  // Auto-save draft functionality
  const { 
    saveDraft, 
    clearDraft, 
    onTabChange, 
    lastSaved, 
    isSaving: isSavingDraft,
    draftId 
  } = useAutoSaveDraft({
    form,
    draftKey: 'incident-report-draft',
    autoSaveInterval: 30000, // Save every 30 seconds
    onSaveToServer: true, // Enabled now that we use RLS-bypassing RPCs
  });

  // Format last saved time
  const formatLastSaved = (date: Date | null) => {
    if (!date) return null;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    
    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

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
      const newTab = tabOrder[currentTabIndex + 1].id;
      onTabChange(newTab); // Auto-save on tab change
      setActiveTab(newTab);
    }
  };

  const handlePrevTab = () => {
    if (!isFirstTab) {
      const newTab = tabOrder[currentTabIndex - 1].id;
      onTabChange(newTab); // Auto-save on tab change
      setActiveTab(newTab);
    }
  };

  const handleTabClick = (tabId: string) => {
    onTabChange(tabId); // Auto-save on tab change
    setActiveTab(tabId);
  };

  const handleSaveDraft = () => {
    saveDraft(activeTab, true);
  };

  const onSubmit = async (data: IncidentReportFormData) => {
    try {
      await submitIncident(data);
      clearDraft(); // Clear draft on successful submission
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">
          <Card className="shadow-lg border-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
            <CardHeader className="space-y-4 border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
              <div className="flex justify-between items-start">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/dashboard")}
                  disabled={isSubmitting}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
                <div className="text-center flex-1">
                  <CardTitle className="text-2xl">Incident Report</CardTitle>
                  <p className="text-muted-foreground mt-1">
                    Report workplace incidents and injuries
                  </p>
                </div>
                {/* Draft status indicator */}
                <div className="w-[140px] flex flex-col items-end gap-1">
                  {lastSaved && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Saved {formatLastSaved(lastSaved)}</span>
                    </div>
                  )}
                  {draftId && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                      Draft
                    </span>
                  )}
                </div>
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

            <CardContent className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-8">
              <Form {...form}>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                  <Tabs value={activeTab} onValueChange={handleTabClick}>
                    {/* Improved responsive tab layout */}
                    <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1 h-auto p-1">
                      {tabOrder.map((tab) => (
                        <TabsTrigger
                          key={tab.id}
                          value={tab.id}
                          className="text-xs sm:text-sm font-medium px-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                          disabled={isSubmitting}
                        >
                          <span className="truncate">{tab.title}</span>
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {/* Enhanced tab content with proper spacing and container sizing */}
                    <div className="mt-6">
                      <TabsContent value="notification" className="mt-0">
                        <div className="bg-card rounded-lg border p-6 space-y-6">
                          <DataErrorBoundary errorTitle="Failed to load notification section">
                            <NotificationSection form={form} />
                          </DataErrorBoundary>
                        </div>
                      </TabsContent>

                      <TabsContent value="worker" className="mt-0">
                        <div className="bg-card rounded-lg border p-6 space-y-6">
                          <DataErrorBoundary errorTitle="Failed to load worker details">
                            <WorkerDetailsSection form={form} />
                          </DataErrorBoundary>
                        </div>
                      </TabsContent>

                      <TabsContent value="employment" className="mt-0">
                        <div className="bg-card rounded-lg border p-6 space-y-6">
                          <DataErrorBoundary errorTitle="Failed to load employment section">
                            <EmploymentSection form={form} />
                          </DataErrorBoundary>
                        </div>
                      </TabsContent>

                      <TabsContent value="injury" className="mt-0">
                        <div className="bg-card rounded-lg border p-6 space-y-6">
                          <DataErrorBoundary errorTitle="Failed to load injury details">
                            <InjuryDetailsSection form={form} />
                          </DataErrorBoundary>
                        </div>
                      </TabsContent>

                      <TabsContent value="treatment" className="mt-0">
                        <div className="bg-card rounded-lg border p-6 space-y-6">
                          <DataErrorBoundary errorTitle="Failed to load treatment section">
                            <TreatmentDetailsSection form={form} />
                          </DataErrorBoundary>
                        </div>
                      </TabsContent>

                      <TabsContent value="actions" className="mt-0">
                        <div className="bg-card rounded-lg border p-6 space-y-6">
                          <DataErrorBoundary errorTitle="Failed to load actions section">
                            <ActionsTakenSection form={form} />
                          </DataErrorBoundary>
                        </div>
                      </TabsContent>

                      <TabsContent value="notes" className="mt-0">
                        <div className="bg-card rounded-lg border p-6 space-y-6">
                          <DataErrorBoundary errorTitle="Failed to load case notes">
                            <CaseNotesSection form={form} />
                          </DataErrorBoundary>
                        </div>
                      </TabsContent>

                      <TabsContent value="documents" className="mt-0">
                        <div className="bg-card rounded-lg border p-6 space-y-6">
                          <DataErrorBoundary errorTitle="Failed to load documents section">
                            <DocumentsSection form={form} />
                          </DataErrorBoundary>
                        </div>
                      </TabsContent>
                    </div>
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
                      {/* Save Draft button - always visible */}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSaveDraft}
                        disabled={isSubmitting || isSavingDraft}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        {isSavingDraft ? 'Saving...' : 'Save Draft'}
                      </Button>

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
      <SuccessDialog />
    </DataErrorBoundary>
  );
};

export default IncidentReport;