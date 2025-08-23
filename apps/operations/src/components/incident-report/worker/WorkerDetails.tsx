import { FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Control } from "react-hook-form";
import type { IncidentReportFormData } from "@/lib/validations/incident";

interface WorkerDetailsProps {
  control: Control<IncidentReportFormData>;
}

export function WorkerDetails({ control }: WorkerDetailsProps) {
  return (
    <>
      <FormField
        control={control}
        name="worker_name"
        render={({ field }) => (
          <FormItem>
            <Label htmlFor="worker_name">Name</Label>
            <Input {...field} id="worker_name" readOnly />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="worker_address"
        render={({ field }) => (
          <FormItem>
            <Label htmlFor="worker_address">Address</Label>
            <Input {...field} id="worker_address" readOnly />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="worker_phone"
          render={({ field }) => (
            <FormItem>
              <Label htmlFor="worker_phone">Telephone</Label>
              <Input {...field} id="worker_phone" type="tel" readOnly />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="worker_dob"
          render={({ field }) => (
            <FormItem>
              <Label htmlFor="worker_dob">Date of Birth</Label>
              <Input {...field} id="worker_dob" type="date" readOnly />
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
    </>
  );
}