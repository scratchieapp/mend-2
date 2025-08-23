import { z } from 'zod';

// Email validation
const emailSchema = z.string()
  .email('Invalid email address')
  .min(5, 'Email too short')
  .max(255, 'Email too long');

// Password validation
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// Login schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

// User creation schema
export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirm_password: z.string(),
  display_name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name contains invalid characters'),
  role_id: z.number().min(1, 'Role is required'),
  employer_id: z.string().optional(),
  site_id: z.string().optional(),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

// User update schema
export const updateUserSchema = z.object({
  email: emailSchema.optional(),
  display_name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long')
    .optional(),
  custom_display_name: z.string()
    .max(100, 'Custom name too long')
    .optional(),
  role_id: z.number().min(1).optional(),
  employer_id: z.string().optional(),
  site_id: z.string().optional(),
});

// Password reset schema
export const passwordResetSchema = z.object({
  email: emailSchema,
});

// Password change schema
export const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: passwordSchema,
  confirm_password: z.string(),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
}).refine((data) => data.current_password !== data.new_password, {
  message: "New password must be different from current password",
  path: ["new_password"],
});

// Profile update schema
export const profileUpdateSchema = z.object({
  display_name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long'),
  email: emailSchema,
  phone: z.string()
    .regex(/^(\+61|0)[2-478][\d]{8}$/, 'Invalid Australian phone number')
    .optional()
    .or(z.literal('')),
  emergency_contact_name: z.string()
    .max(100, 'Contact name too long')
    .optional(),
  emergency_contact_phone: z.string()
    .regex(/^(\+61|0)[2-478][\d]{8}$/, 'Invalid Australian phone number')
    .optional()
    .or(z.literal('')),
});

// Type exports
export type LoginFormData = z.infer<typeof loginSchema>;
export type CreateUserFormData = z.infer<typeof createUserSchema>;
export type UpdateUserFormData = z.infer<typeof updateUserSchema>;
export type PasswordResetFormData = z.infer<typeof passwordResetSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;