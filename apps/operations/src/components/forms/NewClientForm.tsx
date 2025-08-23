import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { BusinessDetailsSection } from "./sections/BusinessDetailsSection";
import { ManagerDetailsSection } from "./sections/ManagerDetailsSection";
import { clientFormSchema, type ClientFormValues } from "./validation/clientFormSchema";

export function NewClientForm() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      employer_name: "",
      abn: "",
      employer_address: "",
      employer_state: "",
      employer_post_code: "",
      employer_phone: "",
      manager_name: "",
      manager_email: "",
      manager_phone: "",
    },
  });

  const onSubmit = async (values: ClientFormValues) => {
    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase
        .from('employers')
        .insert([values])
        .select()
        .single();

      if (error) throw error;

      toast.success("Client added successfully");
      navigate(`/employer/${data.employer_id}`);
    } catch (error) {
      console.error('Submission error:', error);
      toast.error("Failed to add client");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <BusinessDetailsSection form={form} />
        <ManagerDetailsSection form={form} />

        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {isSubmitting ? "Adding Client..." : "Add Client"}
        </Button>
      </form>
    </Form>
  );
}