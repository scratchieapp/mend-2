import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { 
  Phone, 
  UserCheck, 
  CalendarCheck, 
  CheckCircle2, 
  Clock, 
  XCircle,
  Bot,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BookingWorkflowTimelineProps {
  incidentId: number;
}

interface BookingWorkflow {
  id: string;
  incident_id: number;
  status: string;
  last_call_type: string | null;
  available_times: unknown[];
  confirmed_datetime: string | null;
  failure_reason: string | null;
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
    statuses: ['calling_medical_center', 'awaiting_times'],
  },
  {
    id: 'confirming_patient',
    label: 'Patient Confirmation',
    description: 'Confirming with patient',
    icon: UserCheck,
    statuses: ['times_received', 'calling_patient', 'awaiting_patient_confirmation'],
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
      // First get the workflow
      const { data: workflowData, error } = await supabase
        .from('booking_workflows')
        .select('*')
        .eq('incident_id', incidentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching booking workflow:', error);
        return null;
      }
      
      if (!workflowData) {
        return null;
      }

      // Get the medical center info if we have an ID
      let medicalCenterInfo = null;
      if (workflowData.medical_center_id) {
        const { data: mcData } = await supabase
          .from('medical_centers')
          .select('name, phone_number')
          .eq('id', workflowData.medical_center_id)
          .single();
        if (mcData) {
          medicalCenterInfo = { 
            name: mcData.name, 
            phone_number: mcData.phone_number 
          };
        }
      }

      // Get the worker info if we have a worker_id
      let workerInfo = null;
      if (workflowData.worker_id) {
        const { data: workerData } = await supabase
          .from('workers')
          .select('given_name, family_name, mobile_number, phone_number')
          .eq('worker_id', workflowData.worker_id)
          .single();
        if (workerData) {
          workerInfo = {
            name: `${workerData.given_name} ${workerData.family_name}`.trim(),
            phone: workerData.mobile_number || workerData.phone_number
          };
        }
      }

      return {
        ...workflowData,
        medical_center: medicalCenterInfo,
        worker: workerInfo
      } as BookingWorkflow;
    },
    refetchInterval: 10000, // Poll every 10 seconds for updates
  });

  // Don't show anything if no workflow exists
  if (!workflow && !isLoading) {
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
          <span className="text-xs text-muted-foreground">
            Started {workflow?.created_at ? format(new Date(workflow.created_at), 'MMM d, h:mm a') : ''}
          </span>
        </div>

        {/* Timeline Steps */}
        {!isFailed && (
          <div className="flex items-center justify-between">
            {WORKFLOW_STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index === currentStepIndex;
              const isComplete = index < currentStepIndex || isCompleted;
              const isPending = index > currentStepIndex && !isCompleted;

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
                      isComplete ? "bg-emerald-500 text-white" :
                      isActive ? "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500 ring-offset-2" :
                      "bg-gray-100 text-gray-400"
                    )}>
                      {isActive && !isCompleted ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <StepIcon className="h-5 w-5" />
                      )}
                    </div>
                    <span className={cn(
                      "text-xs mt-2 font-medium text-center",
                      isComplete ? "text-emerald-700" :
                      isActive ? "text-emerald-600" :
                      "text-gray-400"
                    )}>
                      {step.label}
                    </span>
                    {isActive && !isCompleted && (
                      <span className="text-[10px] text-emerald-600 mt-0.5 text-center max-w-[100px]">
                        {getStepDescription()}
                      </span>
                    )}
                  </div>

                  {/* Connector Line */}
                  {index < WORKFLOW_STEPS.length - 1 && (
                    <div className={cn(
                      "flex-1 h-0.5 mx-2 transition-all duration-300",
                      index < currentStepIndex || isCompleted ? "bg-emerald-500" : "bg-gray-200"
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        )}

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

        {/* Failed State */}
        {isFailed && (
          <div className="mt-2 space-y-1">
            <p className="text-sm text-red-600">
              {workflow?.failure_reason || 'The booking process encountered an issue.'}
            </p>
            {workflow?.medical_center && (
              <p className="text-xs text-red-500">
                <span className="font-medium">Medical Center:</span> {workflow.medical_center.name}
                {workflow.medical_center.phone_number && ` (${workflow.medical_center.phone_number})`}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Please try again or book manually.
            </p>
          </div>
        )}

        {/* Medical Center Info */}
        {workflow?.medical_center?.name && !isFailed && (
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

