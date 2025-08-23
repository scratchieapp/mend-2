import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { incidentReportSchema, type IncidentReportFormData } from "@/lib/validations/incident";

const IncidentReportDev = () => {
  const [activeTab, setActiveTab] = useState("notification");

  const form = useForm<IncidentReportFormData>({
    resolver: zodResolver(incidentReportSchema),
    mode: 'onBlur',
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
    // Form submitted (dev mode)
    alert('Form submitted successfully! (Development mode)');
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
      notes: [],
      documents: [],
    };

    const fieldsForCurrentTab = tabErrorFields[activeTab] || [];
    return fieldsForCurrentTab.some(field => errors[field as keyof typeof errors]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <Card className="shadow-lg border-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
          <CardHeader className="space-y-8 border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl">Incident Report (Dev)</CardTitle>
                <p className="text-muted-foreground mt-1">
                  Report workplace incidents and injuries - Development Version
                </p>
              </div>
            </div>

            {/* Progress indicator */}
            {/* Improved Progress Indicator */}
            <div className="flex items-center justify-between space-x-1 overflow-x-auto pb-2">
              {tabOrder.map((tab, index) => (
                <div key={tab.id} className="flex flex-col items-center min-w-0 flex-1">
                  <div className="flex items-center w-full">
                    {index > 0 && (
                      <div className={`flex-1 h-0.5 ${
                        index <= currentTabIndex ? 'bg-primary' : 'bg-muted'
                      }`} />
                    )}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold mx-2 transition-colors ${
                        index <= currentTabIndex
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {index + 1}
                    </div>
                    {index < tabOrder.length - 1 && (
                      <div className={`flex-1 h-0.5 ${
                        index < currentTabIndex ? 'bg-primary' : 'bg-muted'
                      }`} />
                    )}
                  </div>
                  <span className={`mt-2 text-xs text-center font-medium truncate ${
                    index <= currentTabIndex ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {tab.title}
                  </span>
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

          <CardContent className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-8">
            <Form {...form}>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  {/* Improved responsive tab layout */}
                  <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1 h-auto p-1">
                    {tabOrder.map((tab) => (
                      <TabsTrigger
                        key={tab.id}
                        value={tab.id}
                        className="text-xs sm:text-sm font-medium px-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      >
                        <span className="truncate">{tab.title}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {/* Enhanced tab content with proper spacing and container sizing */}
                  <div className="mt-6">
                    <TabsContent value="notification" className="mt-0">
                      <div className="bg-card rounded-lg border p-6 space-y-6">
                        <NotificationSection form={form} />
                      </div>
                    </TabsContent>

                    <TabsContent value="worker" className="mt-0">
                      <div className="bg-card rounded-lg border p-6 space-y-6">
                        <WorkerDetailsSection form={form} />
                      </div>
                    </TabsContent>

                    <TabsContent value="employment" className="mt-0">
                      <div className="bg-card rounded-lg border p-6 space-y-6">
                        <EmploymentSection form={form} />
                      </div>
                    </TabsContent>

                    <TabsContent value="injury" className="mt-0">
                      <div className="bg-card rounded-lg border p-6 space-y-6">
                        <InjuryDetailsSection form={form} />
                      </div>
                    </TabsContent>

                    <TabsContent value="treatment" className="mt-0">
                      <div className="bg-card rounded-lg border p-6 space-y-6">
                        <TreatmentDetailsSection form={form} />
                      </div>
                    </TabsContent>

                    <TabsContent value="actions" className="mt-0">
                      <div className="bg-card rounded-lg border p-6 space-y-6">
                        <ActionsTakenSection form={form} />
                      </div>
                    </TabsContent>

                    <TabsContent value="notes" className="mt-0">
                      <div className="bg-card rounded-lg border p-6 space-y-6">
                        <CaseNotesSection form={form} />
                      </div>
                    </TabsContent>

                    <TabsContent value="documents" className="mt-0">
                      <div className="bg-card rounded-lg border p-6 space-y-6">
                        <DocumentsSection form={form} />
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
                    disabled={isFirstTab}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Previous
                  </Button>

                  <div className="flex space-x-2">
                    {!isLastTab ? (
                      <Button
                        type="button"
                        onClick={handleNextTab}
                        disabled={currentTabHasErrors()}
                      >
                        Next
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        disabled={!isValid || !isDirty}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Submit Report
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
  );
};

export default IncidentReportDev;