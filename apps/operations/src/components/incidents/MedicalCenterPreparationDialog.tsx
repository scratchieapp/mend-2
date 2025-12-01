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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { 
  CheckCircle2, 
  Loader2, 
  Phone, 
  Stethoscope, 
  ClipboardList,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MedicalCenterPreparationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medicalCenter: {
    id: string;
    name: string;
    phone_number: string;
    address?: string;
    suburb?: string;
    state?: string;
    mend_prepared?: boolean;
    mend_prepared_at?: string | null;
    mend_prepared_by?: string | null;
  };
  onSuccess?: () => void;
}

const BRIEFING_CHECKLIST = [
  {
    id: 'introduction',
    label: 'Introduced Mend and explained our workplace injury management services',
  },
  {
    id: 'ai_calls',
    label: 'Explained that an AI assistant ("Emma") will call to book appointments',
  },
  {
    id: 'workcover',
    label: 'Confirmed they accept WorkCover/workers compensation patients',
  },
  {
    id: 'suitable_duties',
    label: 'Explained our focus on suitable duties and early return-to-work',
  },
  {
    id: 'reporting',
    label: 'Discussed reporting requirements and certificate of capacity',
  },
  {
    id: 'contact',
    label: 'Provided Mend contact details for queries',
  },
];

export function MedicalCenterPreparationDialog({
  open,
  onOpenChange,
  medicalCenter,
  onSuccess,
}: MedicalCenterPreparationDialogProps) {
  const { userData } = useAuth();
  const queryClient = useQueryClient();
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const allChecked = checkedItems.length === BRIEFING_CHECKLIST.length;

  const markPreparedMutation = useMutation({
    mutationFn: async () => {
      const preparedBy = userData?.custom_display_name || userData?.display_name || userData?.email || 'Unknown';
      const { data, error } = await supabase.rpc('mark_medical_center_prepared', {
        p_medical_center_id: medicalCenter.id,
        p_prepared_by: preparedBy,
        p_notes: notes || `Briefing completed. Checklist items covered: ${checkedItems.join(', ')}`,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to mark as prepared');
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Medical Center Prepared',
        description: `${medicalCenter.name} has been marked as prepared for AI voice calls.`,
      });
      queryClient.invalidateQueries({ queryKey: ['medical-centers'] });
      queryClient.invalidateQueries({ queryKey: ['site-medical-centers'] });
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark medical center as prepared.',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setCheckedItems([]);
    setNotes('');
  };

  const toggleCheckItem = (itemId: string) => {
    setCheckedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  // If already prepared, show confirmation view
  if (medicalCenter.mend_prepared) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Already Prepared
            </DialogTitle>
            <DialogDescription>
              {medicalCenter.name} has already been briefed and is ready for AI voice calls.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800 font-medium mb-2">
                <CheckCircle2 className="h-4 w-4" />
                Preparation Complete
              </div>
              <div className="text-sm text-green-700 space-y-1">
                {medicalCenter.mend_prepared_at && (
                  <p>Prepared: {new Date(medicalCenter.mend_prepared_at).toLocaleDateString('en-AU', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</p>
                )}
                {medicalCenter.mend_prepared_by && (
                  <p>By: {medicalCenter.mend_prepared_by}</p>
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
            <Stethoscope className="h-5 w-5 text-blue-600" />
            Prepare Medical Center
          </DialogTitle>
          <DialogDescription>
            Brief {medicalCenter.name} on Mend's approach before enabling AI voice calls.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Medical Center Info */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="font-medium">{medicalCenter.name}</div>
            {medicalCenter.address && (
              <div className="text-sm text-muted-foreground">{medicalCenter.address}</div>
            )}
            {(medicalCenter.suburb || medicalCenter.state) && (
              <div className="text-sm text-muted-foreground">
                {[medicalCenter.suburb, medicalCenter.state].filter(Boolean).join(', ')}
              </div>
            )}
            {medicalCenter.phone_number && (
              <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <Phone className="h-3 w-3" />
                {medicalCenter.phone_number}
              </div>
            )}
          </div>

          {/* Instructions */}
          <Alert>
            <Phone className="h-4 w-4" />
            <AlertDescription>
              Call the medical center to brief them on Mend's services. Use the checklist below to ensure all key points are covered.
            </AlertDescription>
          </Alert>

          {/* Briefing Checklist */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              <Label className="font-medium">Briefing Checklist</Label>
            </div>
            
            <div className="space-y-3 pl-1">
              {BRIEFING_CHECKLIST.map((item) => (
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

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes from the call..."
              rows={3}
            />
          </div>

          {/* Warning if not all checked */}
          {!allChecked && checkedItems.length > 0 && (
            <Alert variant="default" className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                Not all checklist items are complete. Ensure the medical center understands all points before marking as prepared.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => markPreparedMutation.mutate()}
            disabled={checkedItems.length === 0 || markPreparedMutation.isPending}
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

