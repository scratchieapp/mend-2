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

interface WorkerSelectorProps {
  control: Control<IncidentReportFormData>;
}

export function WorkerSelector({ control }: WorkerSelectorProps) {
  const { setValue, getValues } = useFormContext();
  const [isAddingNew, setIsAddingNew] = useState(false);
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

  // For edit mode, fetch all workers if we have a worker_id but no employer selected
  const shouldFetchAllWorkers = !selectedEmployerId && !!currentWorkerId;

  const { data: workers = [], isLoading, refetch } = useQuery({
    queryKey: ['workers', selectedEmployerId, shouldFetchAllWorkers],
    queryFn: async () => {
      let query = supabase.from('workers').select('*');
      
      if (shouldFetchAllWorkers) {
        // In edit mode, fetch all workers to ensure we can display the current one
        query = query.order('given_name', { ascending: true });
      } else if (selectedEmployerId) {
        // In create mode or when employer is selected
        query = query.eq('employer_id', selectedEmployerId);
      } else {
        return [];
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      return data as Worker[];
    },
    enabled: !!selectedEmployerId || shouldFetchAllWorkers,
  });
  
  // Auto-populate worker details when workers are loaded and we have a worker_id
  useEffect(() => {
    if (currentWorkerId && workers.length > 0) {
      const selectedWorker = workers.find(w => w.worker_id.toString() === currentWorkerId);
      if (selectedWorker && !getValues('worker_name')) {
        setValue('worker_name', `${selectedWorker.given_name} ${selectedWorker.family_name}`);
        setValue('worker_address', selectedWorker.residential_address);
        setValue('worker_phone', selectedWorker.phone_number);
        setValue('worker_dob', selectedWorker.date_of_birth);
        setValue('worker_gender', selectedWorker.gender);
        if (selectedWorker.employment_type) {
          setValue('employment_type', selectedWorker.employment_type);
        }
      }
    }
  }, [workers, currentWorkerId, setValue, getValues]);

  const handleAddNewWorker = async () => {
    if (!newWorker.given_name || !newWorker.family_name) return;
    
    try {
      const { data, error } = await supabase
        .from('workers')
        .insert({
          given_name: newWorker.given_name,
          family_name: newWorker.family_name,
          phone_number: newWorker.phone_number || null,
          residential_address: newWorker.residential_address || null,
          date_of_birth: newWorker.date_of_birth || null,
          gender: newWorker.gender || null,
          employer_id: selectedEmployerId ? parseInt(selectedEmployerId) : null,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Select the new worker
      setValue('worker_id', data.worker_id.toString());
      setValue('worker_name', `${data.given_name} ${data.family_name}`);
      setValue('worker_address', data.residential_address);
      setValue('worker_phone', data.phone_number);
      setValue('worker_dob', data.date_of_birth);
      setValue('worker_gender', data.gender);
      
      // Reset form and close
      setNewWorker({ given_name: "", family_name: "", phone_number: "", residential_address: "", date_of_birth: "", gender: "Male" });
      setIsAddingNew(false);
      refetch();
    } catch (error) {
      console.error('Failed to add worker:', error);
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
            <Input
              value={newWorker.residential_address}
              onChange={(e) => setNewWorker(prev => ({ ...prev, residential_address: e.target.value }))}
              placeholder="Address"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Worker's Telephone</Label>
              <Input
                value={newWorker.phone_number}
                onChange={(e) => setNewWorker(prev => ({ ...prev, phone_number: e.target.value }))}
                placeholder="Phone number"
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
          <div className="flex gap-2">
            <Button onClick={handleAddNewWorker} disabled={!newWorker.given_name || !newWorker.family_name}>
              Save Worker
            </Button>
            <Button variant="outline" onClick={() => setIsAddingNew(false)}>
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
              disabled={isLoading || (!selectedEmployerId && !shouldFetchAllWorkers)}
              onValueChange={(value) => {
                if (value === "add_new") {
                  setIsAddingNew(true);
                  return;
                }
                field.onChange(value);
                const selectedWorker = workers.find(w => w.worker_id.toString() === value);
                if (selectedWorker) {
                  setValue('worker_name', `${selectedWorker.given_name} ${selectedWorker.family_name}`);
                  setValue('worker_address', selectedWorker.residential_address);
                  setValue('worker_phone', selectedWorker.phone_number);
                  setValue('worker_dob', selectedWorker.date_of_birth);
                  setValue('worker_gender', selectedWorker.gender);
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
                  (selectedEmployerId || shouldFetchAllWorkers) ? "Select worker..." : 
                  "Select an employer first"
                } />
              </SelectTrigger>
              <SelectContent>
                {(selectedEmployerId || shouldFetchAllWorkers) && (
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