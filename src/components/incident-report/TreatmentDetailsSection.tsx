import { UseFormReturn } from "react-hook-form";
import type { IncidentReportFormData } from "@/lib/validations/incident";
import { FirstAidSection } from "./treatment/FirstAidSection";
import { DoctorDetails } from "./treatment/DoctorDetails";
import { MedicalProfessionalSelect } from "@/components/MedicalProfessionalSelect";
import { FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { getAllMedicalProfessionals, type MedicalProfessional } from "@/lib/supabase/medical-professionals";

interface TreatmentDetailsSectionProps {
  form: UseFormReturn<IncidentReportFormData>;
}

export function TreatmentDetailsSection({ form }: TreatmentDetailsSectionProps) {
  const [selectedProfessional, setSelectedProfessional] = useState<MedicalProfessional | null>(null);
  const [professionals, setProfessionals] = useState<MedicalProfessional[]>([]);

  // Load professionals on mount
  useEffect(() => {
    const loadProfessionals = async () => {
      try {
        const data = await getAllMedicalProfessionals();
        setProfessionals(data);
      } catch (error) {
        console.error('Failed to load medical professionals:', error);
      }
    };
    loadProfessionals();
  }, []);

  // Update selected professional when form value changes
  const watchedProfessionalId = form.watch("selected_medical_professional");
  useEffect(() => {
    if (watchedProfessionalId && professionals.length > 0) {
      const professional = professionals.find(p => p.doctor_id === parseInt(watchedProfessionalId));
      setSelectedProfessional(professional || null);
    } else {
      setSelectedProfessional(null);
    }
  }, [watchedProfessionalId, professionals]);

  const handleCall = (phoneNumber: string) => {
    window.open(`tel:${phoneNumber}`, '_self');
  };

  const handleEmail = (email: string) => {
    window.open(`mailto:${email}`, '_self');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FirstAidSection control={form.control} />
      </div>
      
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="selected_medical_professional"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Medical Professional</FormLabel>
              <MedicalProfessionalSelect
                value={field.value ? parseInt(field.value) : null}
                onChange={(value) => field.onChange(value?.toString() || "")}
                placeholder="Select medical professional..."
                className="w-full"
              />
            </FormItem>
          )}
        />

        {selectedProfessional && (
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-lg">{selectedProfessional.full_name}</h4>
                    {selectedProfessional.registration_number && (
                      <p className="text-sm text-muted-foreground">
                        Registration: #{selectedProfessional.registration_number}
                      </p>
                    )}
                  </div>
                  {selectedProfessional.specialty && (
                    <Badge variant="secondary" className="px-3 py-1">
                      {selectedProfessional.specialty}
                    </Badge>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  {selectedProfessional.phone_number && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCall(selectedProfessional.phone_number!)}
                      className="flex items-center gap-2"
                    >
                      <Phone className="h-4 w-4" />
                      {selectedProfessional.phone_number}
                    </Button>
                  )}
                  
                  {selectedProfessional.email && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleEmail(selectedProfessional.email!)}
                      className="flex items-center gap-2"
                    >
                      <Mail className="h-4 w-4" />
                      {selectedProfessional.email}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <DoctorDetails control={form.control} />
      </div>
    </div>
  );
}