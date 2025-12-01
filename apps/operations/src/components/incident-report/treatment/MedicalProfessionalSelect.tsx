import { useState, useEffect, useRef } from "react";
import { FormField, FormItem } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Control } from "react-hook-form";
import { Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { IncidentReportFormData } from "@/lib/validations/incident";

interface MedicalProfessional {
  doctor_id: number;
  first_name: string;
  last_name: string;
  specialty: string | null;
  phone_number: string | null;
  email: string | null;
}

interface MedicalProfessionalSelectProps {
  control: Control<IncidentReportFormData>;
}

interface NewMedicalProfessionalData {
  first_name: string;
  last_name: string;
  specialty: string;
  phone_number: string;
  email: string;
  address: string;
  suburb: string;
  state: string;
  post_code: string;
  registration_number: string;
}

const initialFormData: NewMedicalProfessionalData = {
  first_name: "",
  last_name: "",
  specialty: "",
  phone_number: "",
  email: "",
  address: "",
  suburb: "",
  state: "",
  post_code: "",
  registration_number: "",
};

export function MedicalProfessionalSelect({ control }: MedicalProfessionalSelectProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<NewMedicalProfessionalData>(initialFormData);
  const [pendingNewId, setPendingNewId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const onChangeRef = useRef<((value: string) => void) | null>(null);

  const { data: medicalProfessionals } = useQuery({
    queryKey: ['medicalProfessionals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_professionals')
        .select('doctor_id, first_name, last_name, specialty, phone_number, email')
        .order('last_name', { ascending: true });
      
      if (error) {
        throw error;
      }
      
      return data as MedicalProfessional[];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: NewMedicalProfessionalData) => {
      const { data: result, error } = await supabase
        .from('medical_professionals')
        .insert({
          first_name: data.first_name,
          last_name: data.last_name,
          specialty: data.specialty || null,
          phone_number: data.phone_number || null,
          email: data.email || null,
          address: data.address || null,
          suburb: data.suburb || null,
          state: data.state || null,
          post_code: data.post_code || null,
          registration_number: data.registration_number || null,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['medicalProfessionals'] });
      toast.success('Medical professional added successfully');
      setIsDialogOpen(false);
      setFormData(initialFormData);
      // Store the new ID to auto-select it
      setPendingNewId(result.doctor_id);
    },
    onError: (error: Error) => {
      toast.error(`Failed to add medical professional: ${error.message}`);
    },
  });

  // Auto-select the newly created professional when query updates
  useEffect(() => {
    if (pendingNewId && medicalProfessionals?.some(p => p.doctor_id === pendingNewId)) {
      if (onChangeRef.current) {
        onChangeRef.current(pendingNewId.toString());
      }
      setPendingNewId(null);
    }
  }, [pendingNewId, medicalProfessionals]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      toast.error('First name and last name are required');
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <>
      <FormField
        control={control}
        name="selected_medical_professional"
        render={({ field }) => {
          // Store the onChange handler for auto-selection
          onChangeRef.current = field.onChange;
          
          return (
          <FormItem>
            <Label htmlFor="selected_medical_professional">Select Medical Professional</Label>
            <Select 
              value={field.value}
              onValueChange={(value) => {
                if (value === 'new') {
                  setIsDialogOpen(true);
                } else {
                  field.onChange(value);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a medical professional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None selected</SelectItem>
                {medicalProfessionals?.map((professional) => (
                  <SelectItem 
                    key={professional.doctor_id} 
                    value={professional.doctor_id.toString()}
                  >
                    <span className="flex items-center gap-2">
                      <span>{professional.first_name} {professional.last_name}</span>
                      {professional.specialty && (
                        <span className="text-xs text-muted-foreground">({professional.specialty})</span>
                      )}
                    </span>
                  </SelectItem>
                ))}
                <SelectItem value="new" className="text-primary font-medium">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    <span>Add New Medical Professional...</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </FormItem>
          );
        }}
      />

      {/* Add New Medical Professional Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add New Medical Professional
            </DialogTitle>
            <DialogDescription>
              Enter the details of the medical professional who treated the worker.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="John"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="Smith"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialty">Specialty</Label>
                <Input
                  id="specialty"
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  placeholder="e.g., General Practitioner, Orthopedic Surgeon"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="phone_number">Phone Number</Label>
                  <Input
                    id="phone_number"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    placeholder="0400 000 000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="doctor@clinic.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="registration_number">Registration Number</Label>
                <Input
                  id="registration_number"
                  value={formData.registration_number}
                  onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                  placeholder="AHPRA registration number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Practice Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street address"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="suburb">Suburb</Label>
                  <Input
                    id="suburb"
                    value={formData.suburb}
                    onChange={(e) => setFormData({ ...formData, suburb: e.target.value })}
                    placeholder="Suburb"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Select
                    value={formData.state}
                    onValueChange={(value) => setFormData({ ...formData, state: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NSW">NSW</SelectItem>
                      <SelectItem value="VIC">VIC</SelectItem>
                      <SelectItem value="QLD">QLD</SelectItem>
                      <SelectItem value="WA">WA</SelectItem>
                      <SelectItem value="SA">SA</SelectItem>
                      <SelectItem value="TAS">TAS</SelectItem>
                      <SelectItem value="ACT">ACT</SelectItem>
                      <SelectItem value="NT">NT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="post_code">Postcode</Label>
                  <Input
                    id="post_code"
                    value={formData.post_code}
                    onChange={(e) => setFormData({ ...formData, post_code: e.target.value })}
                    placeholder="2000"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Adding...' : 'Add Professional'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
