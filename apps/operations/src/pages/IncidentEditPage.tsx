import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataErrorBoundary } from "@/components/DataErrorBoundary";
import { LoadingState } from "@/components/ui/LoadingState";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft, ArrowRight, Save, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/AuthContext";

// Form sections
import { NotificationSection } from "@/components/incident-report/NotificationSection";
import { WorkerDetailsSection } from "@/components/incident-report/WorkerDetailsSection";
import { EmploymentSection } from "@/components/incident-report/EmploymentSection";
import { InjuryDetailsSection } from "@/components/incident-report/InjuryDetailsSection";
import { TreatmentDetailsSection } from "@/components/incident-report/TreatmentDetailsSection";
import { ActionsTakenSection } from "@/components/incident-report/ActionsTakenSection";
import { CaseNotesSection } from "@/components/incident-report/CaseNotesSection";
import { DocumentsSection } from "@/components/incident-report/DocumentsSection";
import IncidentCostEstimate from "@/components/incident-report/cost/IncidentCostEstimate";

// Hooks and validation
import { incidentEditSchema, type IncidentEditFormData } from "@/lib/validations/incident";
import { logValidationError } from "@/lib/monitoring/errorLogger";
import { supabase } from "@/integrations/supabase/client";

// Field labels for human-readable change descriptions
const fieldLabels: Record<string, string> = {
  notifying_person_name: 'Notifying Person Name',
  notifying_person_position: 'Notifying Person Position',
  notifying_person_telephone: 'Notifying Person Phone',
  worker_id: 'Worker',
  site_id: 'Site',
  date_of_injury: 'Date of Injury',
  time_of_injury: 'Time of Injury',
  injury_type: 'Injury Type',
  body_part_id: 'Body Part',
  injury_description: 'Injury Description',
  witness: 'Witness',
  treatment_provided: 'Treatment Provided',
  referral: 'Referral',
  doctor_details: 'Doctor Details',
  actions: 'Actions Taken',
  case_notes: 'Case Notes',
};

const IncidentEditPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { userData } = useAuth();
  const [activeTab, setActiveTab] = useState("notification");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const originalDataRef = useRef<Record<string, unknown> | null>(null);

  // Fetch existing incident data
  const { data: incidentData, isLoading, error } = useQuery({
    queryKey: ['incident', id],
    queryFn: async () => {
      if (!id) throw new Error('No incident ID provided');
      
      const { data, error } = await supabase
        .from('incidents')
        .select(`
          *,
          workers:worker_id(
            worker_id,
            given_name,
            family_name,
            phone_number,
            mobile_number,
            employer_id,
            employment_type,
            employment_arrangement,
            basis_of_employment
          ),
          employers:employer_id(
            employer_id,
            employer_name,
            employer_address,
            employer_phone,
            manager_name
          ),
          sites:site_id(
            site_id,
            site_name,
            street_address,
            city,
            state,
            post_code,
            supervisor_name,
            supervisor_telephone
          )
        `)
        .eq('incident_id', id)
        .single();

      if (error) {
        console.error('Error fetching incident data:', error);
        throw error;
      }
      
      console.log('Fetched incident data:', data);
      return data;
    },
    enabled: !!id,
  });

  const form = useForm<IncidentEditFormData>({
    resolver: zodResolver(incidentEditSchema),
    mode: 'onBlur',
    defaultValues: {
      mend_client: "Mend Safety Platform",
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
      body_regions: [],
      injury_description: "",
      witness: "",
      type_of_first_aid: "",
      referred_to: "none",
      doctor_details: "",
      selected_medical_professional: "",
      actions_taken: [],
      case_notes: "",
      documents: [],
    },
  });

  // Populate form with existing data
  useEffect(() => {
    if (incidentData) {
      console.log('Raw incident data received:', incidentData);
      
      // Store original data for change tracking (only once)
      if (!originalDataRef.current) {
        originalDataRef.current = {
          notifying_person_name: incidentData.notifying_person_name || '',
          notifying_person_position: incidentData.notifying_person_position || '',
          notifying_person_telephone: incidentData.notifying_person_telephone || '',
          worker_id: incidentData.worker_id,
          site_id: incidentData.site_id,
          date_of_injury: incidentData.date_of_injury || '',
          time_of_injury: incidentData.time_of_injury || '',
          injury_type: incidentData.injury_type || '',
          body_part_id: incidentData.body_part_id,
          injury_description: incidentData.injury_description || '',
          witness: incidentData.witness || '',
          treatment_provided: incidentData.treatment_provided || '',
          referral: incidentData.referral || '',
          doctor_details: incidentData.doctor_details || incidentData.doctor_notes || '',
          actions: incidentData.actions || '',
          case_notes: incidentData.case_notes || '',
        };
      }
      
      // Map database fields to form fields properly
      const formData = {
        // Notification section - use employer_id for mend_client dropdown
        mend_client: incidentData.employer_id?.toString() || "",
        notifying_person_name: incidentData.notifying_person_name || "",
        notifying_person_position: incidentData.notifying_person_position || "",
        notifying_person_telephone: incidentData.notifying_person_telephone || "",
        
        // Worker details
        worker_id: incidentData.worker_id?.toString() || "",
        
        // Employment section
        employer_name: incidentData.workers_employer || incidentData.employers?.employer_name || "",
        location_site: incidentData.site_id?.toString() || "",
        supervisor_contact: incidentData.sites?.supervisor_name || "",
        supervisor_phone: incidentData.sites?.supervisor_telephone || "",
        employment_type: incidentData.workers?.basis_of_employment === "Full Time" ? "full_time" :
                        incidentData.workers?.basis_of_employment === "Part Time" ? "part_time" :
                        incidentData.workers?.basis_of_employment === "Casual" ? "casual" :
                        incidentData.workers?.basis_of_employment === "Contract" ? "contractor" :
                        "full_time" as const,
        
        // Injury details
        date_of_injury: incidentData.date_of_injury || "",
        time_of_injury: incidentData.time_of_injury ? 
          incidentData.time_of_injury.substring(0, 5) : "", // Extract HH:MM from time
        injury_type: incidentData.injury_type || "",
        body_part: incidentData.body_part_id?.toString() || "", // Use body_part_id
        body_side: incidentData.body_side_id === 1 ? "left" :
                   incidentData.body_side_id === 2 ? "right" :
                   incidentData.body_side_id === 3 ? "both" :
                   "not_applicable" as const,
        body_regions: Array.isArray(incidentData.body_regions) ? incidentData.body_regions : [],
        injury_description: incidentData.injury_description || "",
        witness: incidentData.witness || "",
        
        // Treatment details - map from available fields
        type_of_first_aid: incidentData.treatment_provided || "", // Use treatment_provided as first aid
        referred_to: incidentData.referral || "none" as const,
        doctor_details: incidentData.doctor_details || incidentData.doctor_notes || "",
        selected_medical_professional: incidentData.doctor_id?.toString() || "",
        
        // Actions taken
        actions_taken: incidentData.actions ? 
          incidentData.actions.split(';').map((action: string) => action.trim()).filter(Boolean) : [], // Split string into array
        
        // Case notes
        case_notes: incidentData.case_notes || "",
        
        // Documents will be loaded separately
        documents: [],
      };
      
      console.log('Mapped form data:', formData);
      console.log('Current form values before reset:', form.getValues());
      
      // Use setTimeout to ensure the form is ready before resetting
      setTimeout(() => {
        form.reset(formData);
        console.log('Form values after reset:', form.getValues());
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidentData]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: IncidentEditFormData) => {
      if (!id) throw new Error('No incident ID provided');

      // Parse worker_id (allow null for incidents without workers)
      const workerId = data.worker_id ? parseInt(data.worker_id) : null;
      if (data.worker_id && isNaN(workerId as number)) {
        throw new Error('Invalid worker ID');
      }

      // Get site_id from location_site (allow null)
      const siteId = data.location_site ? parseInt(data.location_site) : null;
      if (data.location_site && isNaN(siteId as number)) {
        throw new Error('Invalid site ID');
      }

      // Prepare new values for comparison
      const newValues: Record<string, unknown> = {
        notifying_person_name: data.notifying_person_name,
        notifying_person_position: data.notifying_person_position,
        notifying_person_telephone: data.notifying_person_telephone,
        worker_id: workerId,
        site_id: siteId,
        date_of_injury: data.date_of_injury,
        time_of_injury: data.time_of_injury,
        injury_type: data.injury_type,
        body_part_id: parseInt(data.body_part) || null,
        injury_description: data.injury_description,
        witness: data.witness,
        treatment_provided: data.type_of_first_aid,
        referral: data.referred_to !== 'none' ? data.referred_to : null,
        doctor_details: data.doctor_details,
        actions: data.actions_taken.join('; '),
        case_notes: data.case_notes,
      };

      // Calculate changes
      const changes: { field: string; oldValue: unknown; newValue: unknown }[] = [];
      if (originalDataRef.current) {
        for (const [key, newValue] of Object.entries(newValues)) {
          const oldValue = originalDataRef.current[key];
          // Compare values (stringify for deep comparison)
          if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            changes.push({
              field: key,
              oldValue: oldValue ?? '',
              newValue: newValue ?? '',
            });
          }
        }
      }

      // Update incident record with correct database field mapping
      // Only include fields that have values (to avoid overwriting with empty strings)
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      
      // Only update fields that have actual values
      if (data.notifying_person_name) updateData.notifying_person_name = data.notifying_person_name;
      if (data.notifying_person_position) updateData.notifying_person_position = data.notifying_person_position;
      if (data.notifying_person_telephone) updateData.notifying_person_telephone = data.notifying_person_telephone;
      if (workerId !== null) updateData.worker_id = workerId;
      if (siteId !== null) updateData.site_id = siteId;
      if (data.date_of_injury) updateData.date_of_injury = data.date_of_injury;
      if (data.time_of_injury) updateData.time_of_injury = data.time_of_injury;
      if (data.injury_type) updateData.injury_type = data.injury_type;
      if (data.body_part) updateData.body_part_id = parseInt(data.body_part) || null;
      if (data.body_regions && data.body_regions.length > 0) updateData.body_regions = data.body_regions;
      if (data.injury_description) updateData.injury_description = data.injury_description;
      if (data.witness !== undefined) updateData.witness = data.witness || null;
      if (data.type_of_first_aid) updateData.treatment_provided = data.type_of_first_aid;
      if (data.referred_to && data.referred_to !== 'none') updateData.referral = data.referred_to;
      if (data.doctor_details !== undefined) updateData.doctor_details = data.doctor_details || null;
      if (data.selected_medical_professional) updateData.doctor_id = parseInt(data.selected_medical_professional) || null;
      if (data.actions_taken && data.actions_taken.length > 0) updateData.actions = data.actions_taken.join('; ');
      if (data.case_notes !== undefined) updateData.case_notes = data.case_notes || null;

      const { error: updateError } = await supabase
        .from('incidents')
        .update(updateData)
        .eq('incident_id', id);

      if (updateError) throw updateError;

      // Log activity if there were changes
      if (changes.length > 0) {
        const userName = userData?.custom_display_name || userData?.display_name || userData?.email || 'Unknown User';
        const changeDescriptions = changes.map(c => {
          const label = fieldLabels[c.field] || c.field;
          return `${label}`;
        });
        
        const description = `Updated: ${changeDescriptions.join(', ')}`;
        
        // Insert activity log entry
        const { error: activityError } = await supabase
          .from('incident_activities')
          .insert({
            incident_id: parseInt(id),
            type: 'edit' as const,
            title: 'Incident Updated',
            description: description,
            created_by: userName,
            created_by_user_id: userData?.user_id || null,
            metadata: {
              changes: changes.map(c => ({
                field: c.field,
                fieldLabel: fieldLabels[c.field] || c.field,
                oldValue: c.oldValue,
                newValue: c.newValue,
              })),
            },
          });

        if (activityError) {
          console.error('Failed to log activity:', activityError);
          // Don't fail the update if activity logging fails
        }
      }

      return { incidentId: id };
    },
    onSuccess: (data) => {
      toast.success('Incident updated successfully');
      setShowSuccessDialog(true);
      setTimeout(() => {
        navigate('/dashboard', { 
          state: { 
            justUpdatedIncident: true, 
            incidentId: data.incidentId 
          } 
        });
      }, 2000);
    },
    onError: (error) => {
      console.error('Failed to update incident:', error);
      toast.error('Failed to update incident. Please try again.');
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
    { id: "cost", title: "Cost Estimate", required: false },
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

  const onSubmit = async (data: IncidentEditFormData) => {
    try {
      await updateMutation.mutateAsync(data);
    } catch (error) {
      logValidationError('incident-edit', errors);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading incident data..." />;
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load incident data. Please try again.
          </AlertDescription>
        </Alert>
        <Button 
          className="mt-4" 
          onClick={() => navigate('/dashboard')}
        >
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <DataErrorBoundary errorTitle="Failed to load incident edit form">
        <Card className="max-w-6xl mx-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">
                Edit Incident Report #{incidentData?.incident_number}
              </CardTitle>
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid grid-cols-5 lg:grid-cols-9 mb-6">
                    {tabOrder.map((tab, index) => (
                      <TabsTrigger
                        key={tab.id}
                        value={tab.id}
                        className="text-xs"
                      >
                        <span className="hidden sm:inline">{tab.title}</span>
                        <span className="sm:hidden">{index + 1}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  <TabsContent value="notification">
                    <NotificationSection form={form} />
                  </TabsContent>

                  <TabsContent value="worker">
                    <WorkerDetailsSection form={form} />
                  </TabsContent>

                  <TabsContent value="employment">
                    <EmploymentSection form={form} />
                  </TabsContent>

                  <TabsContent value="injury">
                    <InjuryDetailsSection form={form} />
                  </TabsContent>

                  <TabsContent value="treatment">
                    <TreatmentDetailsSection form={form} />
                  </TabsContent>

                  <TabsContent value="actions">
                    <ActionsTakenSection form={form} />
                  </TabsContent>

                  <TabsContent value="notes">
                    <CaseNotesSection form={form} />
                  </TabsContent>

                  <TabsContent value="cost">
                    <IncidentCostEstimate
                      incidentId={parseInt(id || '0')}
                      classification={incidentData?.classification}
                      daysLost={incidentData?.total_days_lost || 0}
                      bodyPartId={incidentData?.body_part_id}
                      isFatality={incidentData?.fatality}
                      readOnly={false}
                    />
                  </TabsContent>

                  <TabsContent value="documents">
                    <DocumentsSection form={form} />
                  </TabsContent>
                </Tabs>

                {/* Navigation and Submit buttons */}
                <div className="flex justify-between items-center pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrevTab}
                    disabled={isFirstTab}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Previous
                  </Button>

                  <div className="flex gap-2">
                    {!isLastTab && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleNextTab}
                      >
                        Next
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}

                    <Button
                      type="submit"
                      disabled={updateMutation.isPending || !isDirty}
                      className="min-w-[120px]"
                    >
                      {updateMutation.isPending ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Update Report
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Form validation errors */}
                {Object.keys(errors).length > 0 && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Please correct the errors in the form before submitting.
                    </AlertDescription>
                  </Alert>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Success Dialog */}
        {showSuccessDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="max-w-md">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <CheckCircle className="h-12 w-12 text-green-500" />
                  <div>
                    <h3 className="text-lg font-semibold">Update Successful!</h3>
                    <p className="text-muted-foreground mt-2">
                      Incident report has been updated successfully.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DataErrorBoundary>
    </div>
  );
};

export default IncidentEditPage;