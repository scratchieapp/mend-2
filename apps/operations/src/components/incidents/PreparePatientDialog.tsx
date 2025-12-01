import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { 
  CheckCircle2, 
  Loader2, 
  Phone, 
  User,
  ClipboardList,
  Bot,
  Info
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PreparePatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worker: {
    worker_id: number;
    given_name: string;
    family_name: string;
    mobile_number?: string;
    phone_number?: string;
    ai_calls_prepared?: boolean;
    ai_calls_prepared_at?: string | null;
    ai_calls_prepared_by?: string | null;
  };
  onSuccess?: () => void;
}

const PREPARATION_CHECKLIST = [
  {
    id: 'introduction',
    label: 'Introduced myself as calling from Mend on behalf of their employer',
  },
  {
    id: 'ai_assistant',
    label: 'Explained that an AI assistant named "Emma" will call to help manage their injury',
  },
  {
    id: 'booking_calls',
    label: 'Explained Emma will call to book medical appointments and check times suit them',
  },
  {
    id: 'wellbeing_checks',
    label: 'Explained they may receive wellbeing check-in calls to see how they\'re recovering',
  },
  {
    id: 'human_support',
    label: 'Assured them a human case coordinator is always available if they prefer',
  },
  {
    id: 'consent',
    label: 'Confirmed they\'re comfortable receiving AI voice calls',
  },
];

export function PreparePatientDialog({
  open,
  onOpenChange,
  worker,
  onSuccess,
}: PreparePatientDialogProps) {
  const { userData } = useAuth();
  const queryClient = useQueryClient();
  const [checkedItems, setCheckedItems] = useState<string[]>([]);

  const allChecked = checkedItems.length === PREPARATION_CHECKLIST.length;
  const workerPhone = worker.mobile_number || worker.phone_number;
  const workerName = [worker.given_name, worker.family_name].filter(Boolean).join(' ') || 'Unknown';

  const markPreparedMutation = useMutation({
    mutationFn: async () => {
      const preparedBy = userData?.custom_display_name || userData?.display_name || userData?.email || 'Unknown';
      const { data, error } = await supabase.rpc('mark_worker_ai_prepared', {
        p_worker_id: worker.worker_id,
        p_prepared_by: preparedBy,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to mark as prepared');
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Patient Prepared',
        description: `${workerName} has been briefed and is ready for AI voice calls.`,
      });
      queryClient.invalidateQueries({ queryKey: ['worker'] });
      queryClient.invalidateQueries({ queryKey: ['incident'] });
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark patient as prepared.',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setCheckedItems([]);
  };

  const toggleCheckItem = (itemId: string) => {
    setCheckedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  // If already prepared, show confirmation view
  if (worker.ai_calls_prepared) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Already Prepared
            </DialogTitle>
            <DialogDescription>
              {workerName} has already been briefed and is ready for AI voice calls.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800 font-medium mb-2">
                <CheckCircle2 className="h-4 w-4" />
                Preparation Complete
              </div>
              <div className="text-sm text-green-700 space-y-1">
                {worker.ai_calls_prepared_at && (
                  <p>Prepared: {new Date(worker.ai_calls_prepared_at).toLocaleDateString('en-AU', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</p>
                )}
                {worker.ai_calls_prepared_by && (
                  <p>By: {worker.ai_calls_prepared_by}</p>
                )}
              </div>
            </div>
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            Prepare Patient for AI Calls
          </DialogTitle>
          <DialogDescription>
            Brief {workerName} about AI voice calls before the booking workflow begins.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Patient Info */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              {workerName}
            </div>
            {workerPhone && (
              <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <Phone className="h-3 w-3" />
                {workerPhone}
              </div>
            )}
          </div>

          {/* Instructions */}
          <Alert>
            <Phone className="h-4 w-4" />
            <AlertDescription>
              Call the patient to explain that an AI assistant will be helping coordinate their care. Use the checklist below to ensure all key points are covered.
            </AlertDescription>
          </Alert>

          {/* Info about Emma */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800 font-medium mb-2">
              <Bot className="h-4 w-4" />
              About Emma (AI Assistant)
            </div>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>Emma is Mend's AI booking assistant</li>
              <li>She will call to arrange medical appointments</li>
              <li>She'll offer appointment times and let the patient choose</li>
              <li>All calls are recorded for quality and training</li>
              <li>A human coordinator is always available as backup</li>
            </ul>
          </div>

          {/* Preparation Checklist */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              <Label className="font-medium">Preparation Checklist</Label>
            </div>
            
            <div className="space-y-3 pl-1">
              {PREPARATION_CHECKLIST.map((item) => (
                <div key={item.id} className="flex items-start gap-3">
                  <Checkbox
                    id={item.id}
                    checked={checkedItems.includes(item.id)}
                    onCheckedChange={() => toggleCheckItem(item.id)}
                  />
                  <label
                    htmlFor={item.id}
                    className="text-sm cursor-pointer leading-snug"
                  >
                    {item.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Note about one-time preparation */}
          <Alert variant="default" className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              This preparation only needs to be done once per worker. After this, they'll be ready for AI calls on any future incidents.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => markPreparedMutation.mutate()}
            disabled={!allChecked || markPreparedMutation.isPending}
            className="gap-2"
          >
            {markPreparedMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Mark as Prepared
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

