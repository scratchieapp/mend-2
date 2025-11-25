import { FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Control, useWatch } from "react-hook-form";
import type { IncidentReportFormData } from "@/lib/validations/incident";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "lucide-react";

interface WorkerDetailsProps {
  control: Control<IncidentReportFormData>;
}

export function WorkerDetails({ control }: WorkerDetailsProps) {
  // Only show details if a worker is selected
  const workerId = useWatch({ control, name: "worker_id" });
  const workerName = useWatch({ control, name: "worker_name" });
  
  // Don't show anything if no worker selected
  if (!workerId) {
    return null;
  }

  return (
    <Card className="mt-4 border-l-4 border-l-blue-500">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <User className="h-4 w-4" />
          Worker Details: {workerName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={control}
          name="worker_address"
          render={({ field }) => (
            <FormItem>
              <Label htmlFor="worker_address">Worker's Home Address</Label>
              <Input {...field} id="worker_address" readOnly className="bg-muted" />
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
                <Input {...field} id="worker_phone" type="tel" readOnly className="bg-muted" />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="worker_dob"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor="worker_dob">Worker's Date of Birth</Label>
                <Input {...field} id="worker_dob" type="date" readOnly className="bg-muted" />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={control}
          name="worker_gender"
          render={({ field }) => (
            <FormItem>
              <Label>Gender</Label>
              <RadioGroup
                onValueChange={field.onChange}
                value={field.value}
                className="flex space-x-4"
                disabled
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Male" id="gender-m" />
                  <Label htmlFor="gender-m">Male</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Female" id="gender-f" />
                  <Label htmlFor="gender-f">Female</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Other" id="gender-o" />
                  <Label htmlFor="gender-o">Other</Label>
                </div>
              </RadioGroup>
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}