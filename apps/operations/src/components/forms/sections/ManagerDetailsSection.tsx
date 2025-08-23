import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { ClientFormValues } from "../validation/clientFormSchema";

interface ManagerDetailsSectionProps {
  form: UseFormReturn<ClientFormValues>;
}

export const ManagerDetailsSection = ({ form }: ManagerDetailsSectionProps) => {
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="manager_name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Manager Name</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="manager_email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Manager Email</FormLabel>
            <FormControl>
              <Input {...field} type="email" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="manager_phone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Manager Phone</FormLabel>
            <FormControl>
              <Input {...field} type="tel" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};