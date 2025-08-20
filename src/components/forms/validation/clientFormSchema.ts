import * as z from "zod";

export const clientFormSchema = z.object({
  employer_name: z.string().min(2, "Name must be at least 2 characters"),
  abn: z.string().regex(/^\d{11}$/, "ABN must be 11 digits"),
  employer_address: z.string().min(5, "Address must be at least 5 characters"),
  employer_state: z.string().min(2, "State must be at least 2 characters"),
  employer_post_code: z.string().regex(/^\d{4}$/, "Post code must be 4 digits"),
  employer_phone: z.string().min(8, "Phone number must be at least 8 digits"),
  manager_name: z.string().min(2, "Manager name must be at least 2 characters"),
  manager_email: z.string().email("Invalid email address"),
  manager_phone: z.string().min(8, "Phone number must be at least 8 digits"),
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;