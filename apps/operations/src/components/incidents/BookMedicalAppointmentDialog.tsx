import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  Calendar, 
  Loader2, 
  Phone, 
  Stethoscope, 
  MapPin,
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  Building2
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { MedicalCenterPreparationDialog } from './MedicalCenterPreparationDialog';
import { PreparePatientDialog } from './PreparePatientDialog';

interface BookMedicalAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incidentId: number;
  workerName: string;
  workerId?: number;
  siteId?: number;
  workerPreparationStatus?: {
    ai_calls_prepared: boolean;
    ai_calls_prepared_at: string | null;
    ai_calls_prepared_by: string | null;
  };
}

interface MedicalCenter {
  id: string;
  name: string;
  phone_number: string;
  address: string;
  suburb: string;
  postcode: string;
  state: string;
  mend_prepared?: boolean;
  mend_prepared_at?: string | null;
  mend_prepared_by?: string | null;
}

interface SiteMedicalCenter extends MedicalCenter {
  priority: number;
  notes?: string;
  active: boolean;
}

interface MedicalProfessional {
  doctor_id: number;
  first_name: string;
  last_name: string;
  specialty: string;
  medical_center_id: string;
}

export function BookMedicalAppointmentDialog({
  open,
  onOpenChange,
  incidentId,
  workerName,
  workerId,
  siteId,
  workerPreparationStatus,
}: BookMedicalAppointmentDialogProps) {
  const { userData } = useAuth();
  const { getToken } = useClerkAuth();
  const queryClient = useQueryClient();
  const [selectedMedicalCenterId, setSelectedMedicalCenterId] = useState<string>('');
  const [doctorPreference, setDoctorPreference] = useState<'any_doctor' | 'specific_doctor'>('any_doctor');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [urgency, setUrgency] = useState<'normal' | 'urgent' | 'low'>('normal');
  const [showMedicalCenterPrepDialog, setShowMedicalCenterPrepDialog] = useState(false);
  const [showPatientPrepDialog, setShowPatientPrepDialog] = useState(false);

  // Fetch site's preferred medical centers
  const { data: siteMedicalCenters = [] } = useQuery({
    queryKey: ['site-medical-centers', siteId],
    queryFn: async () => {
      if (!siteId) return [];
      const { data, error } = await supabase.rpc('get_site_medical_centers', {
        p_site_id: siteId
      });
      if (error) throw error;
      return (data || []) as SiteMedicalCenter[];
    },
    enabled: open && !!siteId,
  });

  // Fetch all medical centers as fallback
  const { data: allMedicalCenters = [], isLoading: loadingCenters } = useQuery({
    queryKey: ['medical-centers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_centers')
        .select('*')
        .eq('active', true)
        .order('name');
      
      if (error) throw error;
      return data as MedicalCenter[];
    },
    enabled: open,
  });

  // Auto-select site's primary medical center when opened
  useEffect(() => {
    if (open && siteMedicalCenters.length > 0 && !selectedMedicalCenterId) {
      const primaryCenter = siteMedicalCenters.find(c => c.priority === 1);
      if (primaryCenter) {
        setSelectedMedicalCenterId(primaryCenter.id);
      }
    }
  }, [open, siteMedicalCenters, selectedMedicalCenterId]);

  // Always fetch worker preparation status when dialog is open
  // This ensures we get fresh data after the preparation mutation
  const { data: workerPrepStatus } = useQuery({
    queryKey: ['worker-preparation', workerId],
    queryFn: async () => {
      if (!workerId) return null;
      const { data, error } = await supabase.rpc('get_worker_preparation_status', {
        p_worker_id: workerId
      });
      if (error) throw error;
      return data;
    },
    enabled: open && !!workerId,
  });

  // Prefer fetched status over prop (so it updates after mutation)
  const effectiveWorkerPrepStatus = workerPrepStatus || workerPreparationStatus;
  const isWorkerPrepared = effectiveWorkerPrepStatus?.ai_calls_prepared === true;

  // Fetch doctors for selected medical center
  const { data: doctors = [], isLoading: loadingDoctors } = useQuery({
    queryKey: ['medical-professionals', selectedMedicalCenterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_professionals')
        .select('*')
        .eq('medical_center_id', selectedMedicalCenterId)
        .eq('active', true)
        .order('last_name');
      
      if (error) throw error;
      return data as MedicalProfessional[];
    },
    enabled: !!selectedMedicalCenterId && doctorPreference === 'specific_doctor',
  });

  // Check for active booking workflow
  const { data: activeWorkflow } = useQuery({
    queryKey: ['booking-workflow', incidentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_booking_workflow', { p_incident_id: incidentId });
      
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Get the selected medical center object
  const selectedCenter = siteMedicalCenters.find(c => c.id === selectedMedicalCenterId) 
    || allMedicalCenters.find(c => c.id === selectedMedicalCenterId);
  
  const isMedicalCenterPrepared = selectedCenter?.mend_prepared === true;

  // Combine site medical centers with all medical centers
  const displayMedicalCenters = siteMedicalCenters.length > 0
    ? [
        ...siteMedicalCenters,
        ...allMedicalCenters.filter(mc => !siteMedicalCenters.some(smc => smc.id === mc.id))
      ]
    : allMedicalCenters;

  // Initiate booking mutation
  const initiateBookingMutation = useMutation({
    mutationFn: async () => {
      // Get fresh Clerk token for Edge Function auth
      const token = await getToken();
      
      // Use direct fetch to bypass Supabase SDK JWT validation at gateway
      // The Edge Function handles its own auth
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const response = await fetch(`${supabaseUrl}/functions/v1/initiate-booking-workflow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          incident_id: incidentId,
          medical_center_id: selectedMedicalCenterId,
          doctor_preference: doctorPreference,
          preferred_doctor_id: doctorPreference === 'specific_doctor' ? parseInt(selectedDoctorId) : null,
          urgency,
          requested_by: userData?.custom_display_name || userData?.display_name || userData?.email || 'Unknown',
          requested_by_user_id: userData?.user_id,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Booking Started',
        description: `AI agent is now calling the medical center to book an appointment for ${workerName}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['booking-workflow', incidentId] });
      queryClient.invalidateQueries({ queryKey: ['incident-activity', String(incidentId)] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-appointments', incidentId] });
      queryClient.invalidateQueries({ queryKey: ['voice-summary', incidentId] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Booking Failed',
        description: error.message || 'Failed to start booking workflow. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setSelectedMedicalCenterId('');
    setDoctorPreference('any_doctor');
    setSelectedDoctorId('');
    setUrgency('normal');
  };

  const handleSubmit = () => {
    if (!selectedMedicalCenterId) {
      toast({
        title: 'Select Medical Center',
        description: 'Please select a medical center to continue.',
        variant: 'destructive',
      });
      return;
    }

    if (!isMedicalCenterPrepared) {
      toast({
        title: 'Medical Center Not Prepared',
        description: 'Please prepare the medical center before starting AI booking.',
        variant: 'destructive',
      });
      return;
    }

    if (!isWorkerPrepared) {
      toast({
        title: 'Patient Not Prepared',
        description: 'Please prepare the patient for AI calls before starting booking.',
        variant: 'destructive',
      });
      return;
    }

    if (doctorPreference === 'specific_doctor' && !selectedDoctorId) {
      toast({
        title: 'Select Doctor',
        description: 'Please select a specific doctor or choose "Any available doctor".',
        variant: 'destructive',
      });
      return;
    }

    initiateBookingMutation.mutate();
  };

  // If there's an active workflow, show its status instead
  if (activeWorkflow?.found) {
    const workflow = activeWorkflow.workflow;
    const statusMessages: Record<string, string> = {
      initiated: 'Workflow initiated, preparing to call...',
      calling_medical_center: 'AI agent is calling the medical center...',
      times_collected: 'Available times collected, calling patient...',
      calling_patient: 'AI agent is calling the patient...',
      patient_confirmed: 'Patient confirmed, finalizing booking...',
      confirming_booking: 'AI agent is confirming the booking...',
    };

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-600 animate-pulse" />
              Booking In Progress
            </DialogTitle>
            <DialogDescription>
              An AI booking workflow is already active for this incident.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6">
            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                  <Phone className="h-8 w-8 text-blue-600 animate-pulse" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                  <span className="text-xs text-white font-bold">{workflow.call_count}</span>
                </div>
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <p className="text-sm font-medium text-foreground">
                {statusMessages[workflow.status] || `Status: ${workflow.status}`}
              </p>
              <p className="text-xs text-muted-foreground">
                Calls made: {workflow.call_count}
              </p>
            </div>

            {workflow.available_times?.length > 0 && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-2">Available Times:</p>
                <ul className="text-sm space-y-1">
                  {workflow.available_times.slice(0, 3).map((time: any, i: number) => (
                    <li key={i} className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-blue-500" />
                      {time.datetime || time.time}
                      {time.doctor_name && <span className="text-muted-foreground">- {time.doctor_name}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Check if both preparations are complete
  const canStartBooking = isWorkerPrepared && (selectedMedicalCenterId ? isMedicalCenterPrepared : true);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-600" />
              Book Medical Appointment
            </DialogTitle>
            <DialogDescription>
              Our AI agent will call the medical center to find available times, then call {workerName} to confirm.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Preparation Status Section */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Preparation Status</Label>
              
              {/* Worker Preparation */}
              <div className={`p-3 rounded-lg border ${isWorkerPrepared ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="text-sm font-medium">Patient: {workerName}</span>
                  </div>
                  {isWorkerPrepared ? (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Ready
                    </Badge>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowPatientPrepDialog(true)}
                      disabled={!workerId}
                      className="gap-1"
                    >
                      <Clock className="h-3 w-3" />
                      Prepare Patient
                    </Button>
                  )}
                </div>
                {!isWorkerPrepared && (
                  <p className="text-xs text-amber-700 mt-2">
                    Patient must be briefed about AI voice calls before booking can start.
                  </p>
                )}
              </div>

              {/* Medical Center Preparation */}
              {selectedMedicalCenterId && (
                <div className={`p-3 rounded-lg border ${isMedicalCenterPrepared ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span className="text-sm font-medium">{selectedCenter?.name}</span>
                    </div>
                    {isMedicalCenterPrepared ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Ready
                      </Badge>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowMedicalCenterPrepDialog(true)}
                        className="gap-1"
                      >
                        <Clock className="h-3 w-3" />
                        Prepare Clinic
                      </Button>
                    )}
                  </div>
                  {!isMedicalCenterPrepared && (
                    <p className="text-xs text-amber-700 mt-2">
                      Medical center must be briefed on Mend's approach before AI booking.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Medical Center Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Medical Center
              </Label>
              <Select 
                value={selectedMedicalCenterId} 
                onValueChange={setSelectedMedicalCenterId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a medical center..." />
                </SelectTrigger>
                <SelectContent>
                  {loadingCenters ? (
                    <div className="p-2 text-center text-muted-foreground">Loading...</div>
                  ) : displayMedicalCenters.length === 0 ? (
                    <div className="p-2 text-center text-muted-foreground">No medical centers available</div>
                  ) : (
                    <>
                      {/* Site's preferred centers first */}
                      {siteMedicalCenters.length > 0 && (
                        <>
                          <div className="px-2 py-1 text-xs font-medium text-muted-foreground bg-muted/50">
                            Site's Preferred Centers
                          </div>
                          {siteMedicalCenters.map((center) => (
                            <SelectItem key={center.id} value={center.id}>
                              <div className="flex items-center gap-2">
                                <span>{center.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {center.priority === 1 ? 'Primary' : `Backup ${center.priority - 1}`}
                                </Badge>
                                {center.mend_prepared ? (
                                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Clock className="h-3 w-3 text-amber-500" />
                                )}
                              </div>
                            </SelectItem>
                          ))}
                          <div className="px-2 py-1 text-xs font-medium text-muted-foreground bg-muted/50 mt-1">
                            Other Medical Centers
                          </div>
                        </>
                      )}
                      {allMedicalCenters
                        .filter(mc => !siteMedicalCenters.some(smc => smc.id === mc.id))
                        .map((center) => (
                          <SelectItem key={center.id} value={center.id}>
                            <div className="flex items-center gap-2">
                              <span>{center.name}</span>
                              <span className="text-xs text-muted-foreground">
                                ({center.suburb}, {center.state})
                              </span>
                              {center.mend_prepared ? (
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                              ) : (
                                <Clock className="h-3 w-3 text-amber-500" />
                              )}
                            </div>
                          </SelectItem>
                        ))}
                    </>
                  )}
                </SelectContent>
              </Select>

              {selectedCenter && (
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {selectedCenter.phone_number}
                </div>
              )}
            </div>

            {/* Doctor Preference */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4" />
                Doctor Preference
              </Label>
              <RadioGroup
                value={doctorPreference}
                onValueChange={(value) => {
                  setDoctorPreference(value as 'any_doctor' | 'specific_doctor');
                  if (value === 'any_doctor') setSelectedDoctorId('');
                }}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="any_doctor" id="any_doctor" />
                  <Label htmlFor="any_doctor" className="font-normal cursor-pointer">
                    Any available doctor
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem 
                    value="specific_doctor" 
                    id="specific_doctor" 
                    disabled={!selectedMedicalCenterId}
                  />
                  <Label 
                    htmlFor="specific_doctor" 
                    className={`font-normal cursor-pointer ${!selectedMedicalCenterId ? 'text-muted-foreground' : ''}`}
                  >
                    Specific doctor
                  </Label>
                </div>
              </RadioGroup>

              {doctorPreference === 'specific_doctor' && selectedMedicalCenterId && (
                <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select a doctor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingDoctors ? (
                      <div className="p-2 text-center text-muted-foreground">Loading doctors...</div>
                    ) : doctors.length === 0 ? (
                      <div className="p-2 text-center text-muted-foreground">No doctors found</div>
                    ) : (
                      doctors.map((doctor) => (
                        <SelectItem key={doctor.doctor_id} value={String(doctor.doctor_id)}>
                          Dr {doctor.first_name} {doctor.last_name}
                          {doctor.specialty && (
                            <span className="text-muted-foreground ml-1">({doctor.specialty})</span>
                          )}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Urgency */}
            <div className="space-y-2">
              <Label>Urgency</Label>
              <Select value={urgency} onValueChange={(v) => setUrgency(v as typeof urgency)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      Urgent - Earliest available
                    </span>
                  </SelectItem>
                  <SelectItem value="normal">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      Normal - Within a few days
                    </span>
                  </SelectItem>
                  <SelectItem value="low">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-gray-400" />
                      Low - Flexible timing
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Warning if not ready */}
            {!canStartBooking && selectedMedicalCenterId && (
              <Alert variant="default" className="border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">Preparation Required</AlertTitle>
                <AlertDescription className="text-amber-700">
                  Both the patient and medical center must be prepared before starting the AI booking workflow.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!selectedMedicalCenterId || !canStartBooking || initiateBookingMutation.isPending}
              className="gap-2"
            >
              {initiateBookingMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Bot className="h-4 w-4" />
                  Start AI Booking
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Medical Center Preparation Dialog */}
      {selectedCenter && (
        <MedicalCenterPreparationDialog
          open={showMedicalCenterPrepDialog}
          onOpenChange={setShowMedicalCenterPrepDialog}
          medicalCenter={selectedCenter}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['medical-centers'] });
            queryClient.invalidateQueries({ queryKey: ['site-medical-centers', siteId] });
          }}
        />
      )}

      {/* Patient Preparation Dialog */}
      {workerId && (
        <PreparePatientDialog
          open={showPatientPrepDialog}
          onOpenChange={setShowPatientPrepDialog}
          worker={{
            worker_id: workerId,
            given_name: workerName.split(' ')[0] || '',
            family_name: workerName.split(' ').slice(1).join(' ') || '',
            ai_calls_prepared: isWorkerPrepared,
            ai_calls_prepared_at: effectiveWorkerPrepStatus?.ai_calls_prepared_at || null,
            ai_calls_prepared_by: effectiveWorkerPrepStatus?.ai_calls_prepared_by || null,
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['worker-preparation', workerId] });
            queryClient.invalidateQueries({ queryKey: ['incident'] });
          }}
        />
      )}
    </>
  );
}
