import { FormField, FormItem } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Control, useFormContext, useWatch } from "react-hook-form";
import { Worker } from "./types";
import type { IncidentReportFormData } from "@/lib/validations/incident";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, X } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { toast } from "sonner";
import { AddressAutocomplete } from "@/components/ui/AddressAutocomplete";
import { PhoneInput } from "@/components/ui/PhoneInput";

interface WorkerSelectorProps {
  control: Control<IncidentReportFormData>;
}

export function WorkerSelector({ control }: WorkerSelectorProps) {
  const { setValue, getValues } = useFormContext();
  const { userData } = useAuth();
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newWorker, setNewWorker] = useState({
    given_name: "",
    family_name: "",
    phone_number: "",
    residential_address: "",
    date_of_birth: "",
    gender: "Male",
  });
  
  const selectedEmployerId = useWatch({
    control,
    name: "mend_client",
  });
  
  const currentWorkerId = useWatch({
    control,
    name: "worker_id",
  });

  // Check if we have valid IDs for querying
  const hasValidEmployerId = selectedEmployerId && selectedEmployerId !== '';
  const hasValidWorkerId = currentWorkerId && currentWorkerId !== '';
  const canFetchWorkers = hasValidEmployerId || hasValidWorkerId;

  // Debug: Log on every render to track state changes
  console.log('WorkerSelector render - employerId:', selectedEmployerId, 'workerId:', currentWorkerId, 'canFetch:', canFetchWorkers);

  const { data: workers = [], isLoading, refetch, error } = useQuery({
    queryKey: ['workers', selectedEmployerId, currentWorkerId, userData?.role_id, userData?.employer_id],
    queryFn: async () => {
      // Re-compute these values inside the query function to get fresh values
      const empId = selectedEmployerId && selectedEmployerId !== '' ? selectedEmployerId : null;
      const wrkId = currentWorkerId && currentWorkerId !== '' ? currentWorkerId : null;
      
      console.log('WorkerSelector query executing - employerId:', empId, 'workerId:', wrkId);
      
      if (!empId && !wrkId) {
        console.log('WorkerSelector: No employer or worker ID, returning empty');
        return [];
      }
      
      // Determine the employer_id to use for the query
      let queryEmployerId = empId ? parseInt(empId) : null;
      
      // If we have a worker ID but no employer, look up the worker's employer first
      if (!queryEmployerId && wrkId) {
        console.log('WorkerSelector: Looking up employer from worker:', wrkId);
        // Use direct query for this single lookup
        const { data: worker, error: workerError } = await supabase
          .from('workers')
          .select('employer_id')
          .eq('worker_id', parseInt(wrkId))
          .single();
        
        if (workerError) {
          console.error('WorkerSelector: Error looking up worker:', workerError);
        }
        
        if (worker?.employer_id) {
          queryEmployerId = worker.employer_id;
          console.log('WorkerSelector: Found employer_id from worker:', queryEmployerId);
        }
      }
      
      if (!queryEmployerId) {
        console.log('WorkerSelector: No employer_id available, returning empty');
        return [];
      }
      
      // Use RBAC-aware RPC function to bypass RLS issues
      // Note: get_workers_rbac params are (p_employer_id, p_user_role_id, p_user_employer_id)
      console.log('WorkerSelector: Calling get_workers_rbac with employer_id:', queryEmployerId);
      const { data, error: rpcError } = await supabase.rpc('get_workers_rbac', {
        p_employer_id: queryEmployerId,
        p_user_role_id: userData?.role_id || 5, // Default to Builder Admin if not available
        p_user_employer_id: userData?.employer_id ? parseInt(userData.employer_id) : queryEmployerId,
      });
      
      if (rpcError) {
        console.error('WorkerSelector: Error fetching workers via RPC:', rpcError);
        throw rpcError;
      }
      
      // Filter to only active workers on the client side
      let workersList = ((data || []) as Worker[]).filter(w => w.is_active !== false);
      console.log('WorkerSelector: Fetched', workersList.length, 'active workers via RPC');
      
      // Sort by given_name
      workersList.sort((a, b) => (a.given_name || '').localeCompare(b.given_name || ''));
      
      // In edit mode, ensure the current worker is always in the list
      // (even if they were marked inactive)
      if (wrkId && !workersList.some(w => w.worker_id.toString() === wrkId)) {
        console.log('WorkerSelector: Current worker not in list, fetching from all workers');
        // Look for the worker in the unfiltered list (including inactive)
        const allWorkers = (data || []) as Worker[];
        const currentWorker = allWorkers.find((w: Worker) => w.worker_id.toString() === wrkId);
        if (currentWorker) {
          workersList = [currentWorker, ...workersList];
          console.log('WorkerSelector: Added current worker to list');
        }
      }
      
      return workersList;
    },
    enabled: canFetchWorkers,
    staleTime: 0, // Always fetch fresh data
  });
  
  // Log any query errors
  useEffect(() => {
    if (error) {
      console.error('WorkerSelector: Query error:', error);
    }
  }, [error]);
  
  // Force refetch when the employer/worker IDs become valid
  // This handles the case where the form is populated asynchronously
  useEffect(() => {
    if (canFetchWorkers && workers.length === 0 && !isLoading && !error) {
      console.log('WorkerSelector: Triggering refetch due to valid IDs and empty workers');
      refetch();
    }
  }, [canFetchWorkers, workers.length, isLoading, refetch, error]);
  
  // Auto-populate worker details when workers are loaded and we have a worker_id
  useEffect(() => {
    if (currentWorkerId && workers.length > 0) {
      const selectedWorker = workers.find(w => w.worker_id.toString() === currentWorkerId);
      console.log('WorkerSelector: Looking for worker', currentWorkerId, 'in', workers.length, 'workers. Found:', selectedWorker?.given_name);
      if (selectedWorker && !getValues('worker_name')) {
        setValue('worker_name', `${selectedWorker.given_name} ${selectedWorker.family_name}`);
        setValue('worker_address', selectedWorker.residential_address || '');
        setValue('worker_phone', selectedWorker.phone_number || '');
        setValue('worker_dob', selectedWorker.date_of_birth || '');
        setValue('worker_gender', selectedWorker.gender || undefined);
        if (selectedWorker.employment_type) {
          setValue('employment_type', selectedWorker.employment_type);
        }
      }
    }
  }, [workers, currentWorkerId, setValue, getValues]);

  const handleAddNewWorker = async () => {
    if (!newWorker.given_name || !newWorker.family_name) return;
    
    setIsSaving(true);
    try {
      // Use RBAC-aware RPC to add the worker
      const { data, error } = await supabase.rpc('add_worker_rbac', {
        p_given_name: newWorker.given_name,
        p_family_name: newWorker.family_name,
        p_phone_number: newWorker.phone_number || null,
        p_residential_address: newWorker.residential_address || null,
        p_date_of_birth: newWorker.date_of_birth || null,
        p_gender: newWorker.gender || null,
        p_employer_id: selectedEmployerId ? parseInt(selectedEmployerId) : null,
        p_user_role_id: userData?.role_id || null,
        p_user_employer_id: userData?.employer_id ? parseInt(userData.employer_id) : null
      });
      
      if (error) throw error;
      
      if (!data) throw new Error('No worker data returned');
      
      // Select the new worker
      setValue('worker_id', data.worker_id.toString());
      setValue('worker_name', `${data.given_name} ${data.family_name}`);
      setValue('worker_address', data.residential_address || '');
      setValue('worker_phone', data.phone_number || '');
      setValue('worker_dob', data.date_of_birth || '');
      setValue('worker_gender', data.gender || undefined);
      
      // Reset form and close
      setNewWorker({ given_name: "", family_name: "", phone_number: "", residential_address: "", date_of_birth: "", gender: "Male" });
      setIsAddingNew(false);
      toast.success('Worker added successfully');
      refetch();
    } catch (error: any) {
      console.error('Failed to add worker:', error);
      toast.error(error.message || 'Failed to add worker. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isAddingNew) {
    return (
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Add New Worker
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setIsAddingNew(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>First Name *</Label>
              <Input
                value={newWorker.given_name}
                onChange={(e) => setNewWorker(prev => ({ ...prev, given_name: e.target.value }))}
                placeholder="First name"
              />
            </div>
            <div>
              <Label>Last Name *</Label>
              <Input
                value={newWorker.family_name}
                onChange={(e) => setNewWorker(prev => ({ ...prev, family_name: e.target.value }))}
                placeholder="Last name"
              />
            </div>
          </div>
          <div>
            <Label>Worker's Home Address</Label>
            <AddressAutocomplete
              value={newWorker.residential_address}
              onChange={(value) => setNewWorker(prev => ({ ...prev, residential_address: value }))}
              placeholder="Start typing address..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Worker's Telephone</Label>
              <PhoneInput
                value={newWorker.phone_number}
                onChange={(value) => setNewWorker(prev => ({ ...prev, phone_number: value }))}
              />
            </div>
            <div>
              <Label>Worker's Date of Birth</Label>
              <Input
                type="date"
                value={newWorker.date_of_birth}
                onChange={(e) => setNewWorker(prev => ({ ...prev, date_of_birth: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label>Sex</Label>
            <div className="flex gap-4 mt-2">
              {["Male", "Female", "Other"].map((option) => (
                <label key={option} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value={option}
                    checked={newWorker.gender === option}
                    onChange={(e) => setNewWorker(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{option}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleAddNewWorker} 
              disabled={!newWorker.given_name || !newWorker.family_name || isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Worker'}
            </Button>
            <Button variant="outline" onClick={() => setIsAddingNew(false)} disabled={isSaving}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <FormField
        control={control}
        name="worker_id"
        render={({ field }) => (
          <FormItem>
            <Label>Select Worker</Label>
            <Select
              disabled={isLoading || !canFetchWorkers}
              onValueChange={(value) => {
                if (value === "add_new") {
                  setIsAddingNew(true);
                  return;
                }
                field.onChange(value);
                const selectedWorker = workers.find(w => w.worker_id.toString() === value);
                if (selectedWorker) {
                  setValue('worker_name', `${selectedWorker.given_name} ${selectedWorker.family_name}`);
                  setValue('worker_address', selectedWorker.residential_address || '');
                  setValue('worker_phone', selectedWorker.phone_number || '');
                  setValue('worker_dob', selectedWorker.date_of_birth || '');
                  setValue('worker_gender', selectedWorker.gender || undefined);
                  if (selectedWorker.employment_type) {
                    setValue('employment_type', selectedWorker.employment_type);
                  }
                }
              }}
              value={field.value}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  isLoading ? "Loading workers..." : 
                  canFetchWorkers ? "Select worker..." : 
                  "Select an employer first"
                } />
              </SelectTrigger>
              <SelectContent>
                {canFetchWorkers && (
                  <SelectItem value="add_new" className="text-green-600 font-medium">
                    <span className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Add New Worker
                    </span>
                  </SelectItem>
                )}
                {workers.map((worker) => (
                  <SelectItem 
                    key={worker.worker_id} 
                    value={worker.worker_id.toString()}
                  >
                    {`${worker.given_name} ${worker.family_name}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />
    </div>
  );
}