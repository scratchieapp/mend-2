import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  Phone, 
  PhoneCall,
  PhoneOff,
  PhoneMissed,
  UserCheck, 
  CalendarCheck, 
  CheckCircle2, 
  Clock, 
  XCircle,
  Bot,
  Loader2,
  Square,
  History,
  Timer
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

interface BookingWorkflowTimelineProps {
  incidentId: number;
}

interface CallHistoryItem {
  id: string;
  call_sequence: number;
  call_target: 'medical_center' | 'patient';
  target_name: string | null;
  task_type: string;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  outcome: 'completed' | 'no_answer' | 'voicemail' | 'busy' | 'failed' | 'cancelled' | 'in_progress' | null;
  call_successful: boolean;
}

interface BookingWorkflow {
  id: string;
  incident_id: number;
  status: string;
  last_call_type: string | null;
  last_call_outcome: string | null;
  available_times: unknown[];
  confirmed_datetime: string | null;
  failure_reason: string | null;
  retry_attempt: number;
  retry_scheduled_at: string | null;
  medical_center_attempt: number;
  call_count: number;
  patient_call_attempts: number;
  patient_next_retry_at: string | null;
  current_call_started_at: string | null;
  current_call_ended_at: string | null;
  created_at: string;
  updated_at: string;
  medical_center?: {
    name: string;
    phone_number: string | null;
  };
  worker?: {
    name: string;
    phone: string | null;
  };
  call_history?: CallHistoryItem[];
  is_call_active?: boolean;
}

// Define the workflow steps
const WORKFLOW_STEPS = [
  {
    id: 'initiated',
    label: 'Started',
    description: 'Booking initiated',
    icon: Bot,
    statuses: ['initiated', 'calling_medical_center'],
  },
  {
    id: 'getting_times',
    label: 'Getting Times',
    description: 'Calling medical center',
    icon: Phone,
    statuses: ['calling_medical_center', 'awaiting_times', 'times_collected'],
  },
  {
    id: 'confirming_patient',
    label: 'Patient Confirmation',
    description: 'Confirming with patient',
    icon: UserCheck,
    statuses: ['times_collected', 'calling_patient', 'awaiting_patient_confirmation', 'awaiting_patient_retry'],
  },
  {
    id: 'finalizing',
    label: 'Finalizing',
    description: 'Confirming booking',
    icon: CalendarCheck,
    statuses: ['patient_confirmed', 'calling_to_confirm', 'confirming_booking'],
  },
  {
    id: 'completed',
    label: 'Confirmed',
    description: 'Appointment booked',
    icon: CheckCircle2,
    statuses: ['completed', 'confirmed'],
  },
];

// Helper to get call outcome icon and color
function getCallOutcomeDisplay(outcome: string | null): { icon: React.ComponentType<any>; color: string; label: string } {
  switch (outcome) {
    case 'completed':
      return { icon: CheckCircle2, color: 'text-emerald-500', label: 'Connected' };
    case 'no_answer':
      return { icon: PhoneMissed, color: 'text-amber-500', label: 'No answer' };
    case 'voicemail':
      return { icon: PhoneOff, color: 'text-amber-500', label: 'Voicemail' };
    case 'busy':
      return { icon: PhoneOff, color: 'text-amber-500', label: 'Busy' };
    case 'failed':
      return { icon: XCircle, color: 'text-red-500', label: 'Failed' };
    case 'in_progress':
      return { icon: PhoneCall, color: 'text-blue-500', label: 'In progress' };
    default:
      return { icon: Phone, color: 'text-gray-400', label: 'Unknown' };
  }
}

function getStepStatus(workflow: BookingWorkflow, stepStatuses: string[]) {
  const workflowStatus = workflow.status.toLowerCase();
  
  // Check if this step is the current one
  if (stepStatuses.some(s => workflowStatus.includes(s.toLowerCase()))) {
    return 'current';
  }
  
  // Get the index of the current workflow status in our steps
  const currentStepIndex = WORKFLOW_STEPS.findIndex(step => 
    step.statuses.some(s => workflowStatus.includes(s.toLowerCase()))
  );
  
  // Get index of this step
  const thisStepIndex = WORKFLOW_STEPS.findIndex(step => 
    step.statuses === stepStatuses
  );
  
  if (thisStepIndex < currentStepIndex) {
    return 'completed';
  }
  
  return 'pending';
}

export function BookingWorkflowTimeline({ incidentId }: BookingWorkflowTimelineProps) {
  const { data: workflow, isLoading } = useQuery({
    queryKey: ['booking-workflow-timeline', incidentId],
    queryFn: async () => {
      // Use the new RPC that includes call history
      const { data: result, error } = await supabase.rpc('get_booking_workflow_with_history', {
        p_incident_id: incidentId,
      });

      if (error) {
        console.error('Error fetching booking workflow with history:', error);
        // Fallback to direct query
        const { data: workflowData, error: fallbackError } = await supabase
          .from('booking_workflows')
          .select('*, retry_attempt, medical_center_attempt, call_count, patient_call_attempts, patient_next_retry_at, current_call_started_at, current_call_ended_at, last_call_outcome')
          .eq('incident_id', incidentId)
          .not('status', 'in', '("cancelled","completed","failed")')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (fallbackError || !workflowData) return null;

        let medicalCenterInfo = null;
        if (workflowData.medical_center_id) {
          const { data: mcData } = await supabase
            .from('medical_centers')
            .select('name, phone_number')
            .eq('id', workflowData.medical_center_id)
            .single();
          if (mcData) {
            medicalCenterInfo = { name: mcData.name, phone_number: mcData.phone_number };
          }
        }

        return {
          ...workflowData,
          medical_center: medicalCenterInfo,
          worker: null,
          call_history: [],
          is_call_active: workflowData.current_call_started_at && !workflowData.current_call_ended_at,
        } as BookingWorkflow;
      }

      if (!result?.found) {
        return null;
      }

      return {
        ...result.workflow,
        medical_center: result.medical_center,
        worker: null,
        call_history: result.call_history || [],
        is_call_active: result.is_call_active,
      } as BookingWorkflow;
    },
    // Poll more frequently when a call is active (5s), otherwise every 30s
    refetchInterval: (query) => {
      const data = query.state.data;
      // Stop polling if no workflow or workflow is in terminal state
      if (!data || ['cancelled', 'completed', 'failed'].includes(data.status)) {
        return false;
      }
      // Poll faster when a call is in progress
      if (data.is_call_active) {
        return 5000; // Poll every 5 seconds during active call
      }
      return 15000; // Poll every 15 seconds when active but no call in progress
    },
    staleTime: 5000, // Consider data fresh for 5 seconds
  });

  const queryClient = useQueryClient();

  // Cancel workflow mutation
  const cancelWorkflowMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('booking_workflows')
        .update({ 
          status: 'cancelled', 
          failure_reason: 'Cancelled by user',
          updated_at: new Date().toISOString()
        })
        .eq('incident_id', incidentId)
        .not('status', 'in', '("completed","cancelled")');

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Booking Cancelled',
        description: 'The booking workflow has been cancelled.',
      });
      queryClient.invalidateQueries({ queryKey: ['booking-workflow-timeline', incidentId] });
      queryClient.invalidateQueries({ queryKey: ['booking-workflow', incidentId] });
      queryClient.invalidateQueries({ queryKey: ['incident-booking-workflow', incidentId] });
    },
    onError: (error: any) => {
      toast({
        title: 'Cancel Failed',
        description: error.message || 'Failed to cancel the booking workflow.',
        variant: 'destructive',
      });
    },
  });

  // Don't show anything if no workflow exists
  if (!workflow && !isLoading) {
    return null;
  }

  // Hide cancelled workflows completely
  if (workflow?.status === 'cancelled') {
    return null;
  }

  // Hide failed workflows that are older than 1 hour
  if (workflow?.status === 'failed') {
    const updatedAt = new Date(workflow.updated_at);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (updatedAt < oneHourAgo) {
      return null;
    }
  }

  // Show loading state briefly
  if (isLoading) {
    return null; // Don't show loading spinner, just don't render until we have data
  }

  const isFailed = workflow?.status === 'failed';
  const isCompleted = workflow?.status === 'completed' || workflow?.status === 'confirmed';

  // Get current step index for highlighting
  const getCurrentStepIndex = () => {
    if (!workflow) return -1;
    const status = workflow.status.toLowerCase();
    
    for (let i = WORKFLOW_STEPS.length - 1; i >= 0; i--) {
      if (WORKFLOW_STEPS[i].statuses.some(s => status.includes(s.toLowerCase()))) {
        return i;
      }
    }
    return 0;
  };

  const currentStepIndex = getCurrentStepIndex();

  return (
    <div className="mb-6">
      <div className={cn(
        "rounded-xl border p-4",
        isFailed ? "bg-red-50 border-red-200" : "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {isFailed ? (
              <XCircle className="h-5 w-5 text-red-500" />
            ) : isCompleted ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <Loader2 className="h-5 w-5 text-emerald-600 animate-spin" />
            )}
            <h3 className={cn(
              "font-semibold",
              isFailed ? "text-red-700" : "text-emerald-800"
            )}>
              {isFailed ? 'Booking Failed' : isCompleted ? 'Appointment Confirmed' : 'AI Booking in Progress'}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            {!isCompleted && !isFailed && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                onClick={() => cancelWorkflowMutation.mutate()}
                disabled={cancelWorkflowMutation.isPending}
              >
                {cancelWorkflowMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <Square className="h-3 w-3 mr-1" />
                    Cancel
                  </>
                )}
              </Button>
            )}
            <span className="text-xs text-muted-foreground">
              Started {workflow?.created_at ? format(new Date(workflow.created_at), 'MMM d, h:mm a') : ''}
            </span>
          </div>
        </div>

        {/* Timeline Steps - Always show, even when failed */}
        <div className="flex items-center justify-between">
          {WORKFLOW_STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index === currentStepIndex;
            const isComplete = index < currentStepIndex || isCompleted;
            const isPending = index > currentStepIndex && !isCompleted;
            const isFailedStep = isFailed && isActive;

            // Get dynamic description with phone number
            const getStepDescription = () => {
              if (step.id === 'getting_times' && workflow?.medical_center?.phone_number) {
                return `Calling ${workflow.medical_center.phone_number}`;
              }
              if (step.id === 'confirming_patient' && workflow?.worker?.phone) {
                return `Calling ${workflow.worker.phone}`;
              }
              if (step.id === 'finalizing' && workflow?.medical_center?.phone_number) {
                return `Calling ${workflow.medical_center.phone_number}`;
              }
              return step.description;
            };

            return (
              <div key={step.id} className="flex items-center flex-1">
                {/* Step */}
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                    isFailedStep ? "bg-red-500 text-white ring-2 ring-red-300 ring-offset-2" :
                    isComplete ? "bg-emerald-500 text-white" :
                    isActive ? "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500 ring-offset-2" :
                    "bg-gray-100 text-gray-400"
                  )}>
                    {isFailedStep ? (
                      <XCircle className="h-5 w-5" />
                    ) : isActive && !isCompleted ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <StepIcon className="h-5 w-5" />
                    )}
                  </div>
                  <span className={cn(
                    "text-xs mt-2 font-medium text-center",
                    isFailedStep ? "text-red-600" :
                    isComplete ? "text-emerald-700" :
                    isActive ? "text-emerald-600" :
                    "text-gray-400"
                  )}>
                    {step.label}
                  </span>
                  {(isActive || isFailedStep) && !isCompleted && (
                    <span className={cn(
                      "text-[10px] mt-0.5 text-center max-w-[100px]",
                      isFailedStep ? "text-red-500" : "text-emerald-600"
                    )}>
                      {isFailedStep ? 'Failed' : getStepDescription()}
                    </span>
                  )}
                </div>

                {/* Connector Line */}
                {index < WORKFLOW_STEPS.length - 1 && (
                  <div className={cn(
                    "flex-1 h-0.5 mx-2 transition-all duration-300",
                    isFailedStep ? "bg-red-300" :
                    index < currentStepIndex || isCompleted ? "bg-emerald-500" : "bg-gray-200"
                  )} />
                )}
              </div>
            );
          })}
        </div>

        {/* Confirmed Time Display */}
        {isCompleted && workflow?.confirmed_datetime && (
          <div className="mt-4 pt-4 border-t border-emerald-200">
            <div className="flex items-center gap-2 text-emerald-800">
              <CalendarCheck className="h-4 w-4" />
              <span className="text-sm font-medium">
                Appointment: {format(new Date(workflow.confirmed_datetime), 'EEEE, MMMM d, yyyy at h:mm a')}
              </span>
            </div>
          </div>
        )}

        {/* Failed State Details - Shows below timeline */}
        {isFailed && (
          <div className="mt-4 pt-3 border-t border-red-200">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="text-sm text-red-600 font-medium">
                  {workflow?.failure_reason || 'The booking process encountered an issue.'}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-red-500">
                  {workflow?.medical_center && (
                    <span>
                      <span className="font-medium">Clinic:</span> {workflow.medical_center.name}
                      {workflow.medical_center.phone_number && ` (${workflow.medical_center.phone_number})`}
                    </span>
                  )}
                  {workflow && (workflow.call_count > 1 || workflow.medical_center_attempt > 1) && (
                    <span>
                      <span className="font-medium">Attempts:</span> {workflow.call_count || 1} call(s)
                      {workflow.medical_center_attempt > 1 && ` across ${workflow.medical_center_attempt} clinic(s)`}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Try again or book manually
              </span>
            </div>
          </div>
        )}

        {/* Active Call Indicator */}
        {workflow?.is_call_active && (
          <div className="mt-3 pt-3 border-t border-blue-200">
            <div className="flex items-center gap-2 text-blue-700">
              <div className="relative">
                <PhoneCall className="h-4 w-4 animate-pulse" />
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-blue-500 rounded-full animate-ping" />
              </div>
              <span className="text-xs font-medium">
                Call in progress
                {workflow.last_call_type === 'patient' && ' (calling patient)'}
                {workflow.last_call_type === 'medical_center' && ' (calling medical center)'}
              </span>
              {workflow.current_call_started_at && (
                <span className="text-xs text-blue-500 ml-auto">
                  {formatDistanceToNow(new Date(workflow.current_call_started_at), { addSuffix: false })}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Awaiting Patient Retry */}
        {workflow?.status === 'awaiting_patient_retry' && (
          <div className="mt-3 pt-3 border-t border-amber-200">
            <div className="flex items-center gap-2 text-amber-700">
              <Timer className="h-4 w-4" />
              <div className="flex-1">
                <p className="text-xs font-medium">
                  Patient unavailable - retry scheduled
                </p>
                {workflow.patient_next_retry_at && (
                  <p className="text-[10px] text-amber-600">
                    Next attempt at {format(new Date(workflow.patient_next_retry_at), 'h:mm a')}
                    {' '}({formatDistanceToNow(new Date(workflow.patient_next_retry_at), { addSuffix: true })})
                  </p>
                )}
              </div>
              <span className="text-xs text-amber-600">
                Attempt {(workflow.patient_call_attempts || 0)} of 3
              </span>
            </div>
          </div>
        )}

        {/* Awaiting Medical Center Retry */}
        {workflow?.status === 'awaiting_medical_center_retry' && (
          <div className="mt-3 pt-3 border-t border-amber-200">
            <div className="flex items-center gap-2 text-amber-700">
              <Timer className="h-4 w-4" />
              <div className="flex-1">
                <p className="text-xs font-medium">
                  Medical center {workflow.last_call_outcome === 'voicemail' ? 'voicemail reached' : 'unavailable'} - retry scheduled
                </p>
                {workflow.retry_scheduled_at && (
                  <p className="text-[10px] text-amber-600">
                    Next attempt {formatDistanceToNow(new Date(workflow.retry_scheduled_at), { addSuffix: true })}
                  </p>
                )}
              </div>
              <span className="text-xs text-amber-600">
                Attempt {(workflow.retry_attempt || 0)} of 5
              </span>
            </div>
          </div>
        )}

        {/* Retrying State */}
        {workflow?.status === 'retrying' && (
          <div className="mt-3 pt-3 border-t border-amber-200">
            <p className="text-xs text-amber-700 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Retrying call (attempt {(workflow.retry_attempt || 0) + 1} of 3)...
            </p>
          </div>
        )}

        {/* Call History (when there are multiple calls) */}
        {workflow?.call_history && workflow.call_history.length > 0 && (
          <div className="mt-3 pt-3 border-t border-emerald-200/50">
            <div className="flex items-center gap-1 mb-2">
              <History className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground font-medium">Call History</span>
            </div>
            <div className="space-y-1">
              {workflow.call_history.slice(-3).map((call) => {
                const outcomeDisplay = getCallOutcomeDisplay(call.outcome);
                const OutcomeIcon = outcomeDisplay.icon;
                return (
                  <div key={call.id} className="flex items-center gap-2 text-[10px]">
                    <span className="w-4 text-center text-muted-foreground">#{call.call_sequence}</span>
                    <span className="text-muted-foreground">
                      {call.call_target === 'patient' ? 'Patient' : 'Clinic'}
                    </span>
                    {call.started_at && (
                      <span className="text-muted-foreground">
                        {format(new Date(call.started_at), 'h:mm a')}
                      </span>
                    )}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className={cn("flex items-center gap-1 ml-auto", outcomeDisplay.color)}>
                            <OutcomeIcon className="h-3 w-3" />
                            <span>{outcomeDisplay.label}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {call.duration_seconds && (
                            <p>Duration: {Math.floor(call.duration_seconds / 60)}:{(call.duration_seconds % 60).toString().padStart(2, '0')}</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Medical Center Info */}
        {workflow?.medical_center?.name && !isFailed && !workflow?.call_history?.length && (
          <div className="mt-3 pt-3 border-t border-emerald-200/50">
            <p className="text-xs text-emerald-700">
              <span className="font-medium">Medical Center:</span> {workflow.medical_center.name}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

