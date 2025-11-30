import { FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Control, useWatch } from "react-hook-form";
import type { IncidentReportFormData } from "@/lib/validations/incident";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { AddressAutocomplete } from "@/components/ui/AddressAutocomplete";
import { useFormContext } from "react-hook-form";
import { useAuth } from "@/lib/auth/AuthContext";

interface WorkerDetailsProps {
  control: Control<IncidentReportFormData>;
}

export function WorkerDetails({ control }: WorkerDetailsProps) {
  const { getValues, watch } = useFormContext<IncidentReportFormData>();
  const { userData } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const initialValuesRef = useRef<{phone: string, address: string, dob: string, gender: string} | null>(null);
  
  // Only show details if a worker is selected
  const workerId = useWatch({ control, name: "worker_id" });
  const workerName = useWatch({ control, name: "worker_name" });
  const workerPhone = watch("worker_phone");
  const workerAddress = watch("worker_address");
  const workerDob = watch("worker_dob");
  const workerGender = watch("worker_gender");
  
  // Track initial values when worker changes
  useEffect(() => {
    if (workerId) {
      initialValuesRef.current = {
        phone: workerPhone || '',
        address: workerAddress || '',
        dob: workerDob || '',
        gender: workerGender || ''
      };
      setHasUnsavedChanges(false);
    }
  }, [workerId]);
  
  // Check for changes
  useEffect(() => {
    if (initialValuesRef.current && workerId) {
      const hasChanges = 
        initialValuesRef.current.phone !== (workerPhone || '') ||
        initialValuesRef.current.address !== (workerAddress || '') ||
        initialValuesRef.current.dob !== (workerDob || '') ||
        initialValuesRef.current.gender !== (workerGender || '');
      setHasUnsavedChanges(hasChanges);
    }
  }, [workerPhone, workerAddress, workerDob, workerGender, workerId]);
  
  // Don't show anything if no worker selected
  if (!workerId) {
    return null;
  }

  const handleSaveWorkerDetails = async () => {
    if (!workerId) return;
    
    setIsSaving(true);
    
    // Diagnostic logging
    const rpcParams = {
      p_worker_id: parseInt(workerId),
      p_user_role_id: userData?.role_id || null,
      p_user_employer_id: userData?.employer_id ? parseInt(userData.employer_id) : null,
      p_phone_number: workerPhone || null,
      p_residential_address: workerAddress || null,
      p_date_of_birth: workerDob || null,
      p_gender: workerGender || null,
    };
    console.log('WorkerDetails: Saving worker with params:', rpcParams);
    
    try {
      // Use RBAC-aware RPC to bypass RLS issues
      const { data, error } = await supabase.rpc('update_worker_rbac', rpcParams);
      
      console.log('WorkerDetails: RPC response - data:', data, 'error:', error);
      
      if (error) {
        console.error('WorkerDetails: RPC error:', error);
        throw error;
      }
      if (data && !data.success) {
        console.error('WorkerDetails: RPC returned failure:', data);
        throw new Error(data.error || 'Failed to update worker');
      }
      
      console.log('WorkerDetails: Save successful, data:', data);
      
      // Update initial values after successful save
      initialValuesRef.current = {
        phone: workerPhone || '',
        address: workerAddress || '',
        dob: workerDob || '',
        gender: workerGender || ''
      };
      setHasUnsavedChanges(false);
      toast.success('Worker details saved');
    } catch (error: any) {
      console.error('WorkerDetails: Failed to save worker details:', error);
      toast.error(error.message || 'Failed to save worker details');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="mt-4 border-l-4 border-l-blue-500">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Worker Details: {workerName}
          </CardTitle>
          {hasUnsavedChanges && (
            <Button 
              type="button"
              variant="outline" 
              size="sm" 
              onClick={handleSaveWorkerDetails}
              disabled={isSaving}
            >
              <Save className="h-3 w-3 mr-1" />
              {isSaving ? 'Saving...' : 'Save Worker'}
            </Button>
          )}
        </div>
        {hasUnsavedChanges && (
          <p className="text-xs text-amber-600">You have unsaved changes to this worker's details</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={control}
          name="worker_address"
          render={({ field }) => (
            <FormItem>
              <Label htmlFor="worker_address">Worker's Home Address</Label>
              <AddressAutocomplete
                value={field.value || ''}
                onChange={field.onChange}
                placeholder="Enter address..."
              />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={control}
            name="worker_phone"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor="worker_phone">Worker's Telephone</Label>
                <Input 
                  {...field} 
                  id="worker_phone" 
                  type="tel" 
                  placeholder="Enter phone number"
                />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="worker_dob"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor="worker_dob">Worker's Date of Birth</Label>
                <Input {...field} id="worker_dob" type="date" />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={control}
          name="worker_gender"
          render={({ field }) => (
            <FormItem>
              <Label>Sex</Label>
              <RadioGroup
                onValueChange={field.onChange}
                value={field.value || ''}
                defaultValue=""
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Male" id="gender-m" />
                  <Label htmlFor="gender-m" className="cursor-pointer">Male</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Female" id="gender-f" />
                  <Label htmlFor="gender-f" className="cursor-pointer">Female</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Other" id="gender-o" />
                  <Label htmlFor="gender-o" className="cursor-pointer">Other</Label>
                </div>
              </RadioGroup>
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}