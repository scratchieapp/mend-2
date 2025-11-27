import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { UserPlus, Building2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface UserRole {
  role_id: number;
  role_name: string;
  role_label: string;
}

interface Employer {
  employer_id: number;
  employer_name: string;
}

interface AddUserDialogProps {
  open: boolean;
  onClose: () => void;
  onUserCreated?: () => void;
  availableRoles?: string[];
  createUserMutation?: any; // Keep for backwards compatibility
}

export function AddUserDialog({ 
  open, 
  onClose, 
  onUserCreated,
}: AddUserDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    roleId: "",
    employerId: "",
  });

  // Fetch roles
  const { data: roles } = useQuery({
    queryKey: ['user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('role_id');
      
      if (error) throw error;
      return data as UserRole[];
    }
  });

  // Fetch employers
  const { data: employers } = useQuery({
    queryKey: ['employers-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employers')
        .select('employer_id, employer_name')
        .order('employer_name');
      
      if (error) throw error;
      return data as Employer[];
    }
  });

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      roleId: "",
      employerId: "",
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Create user via Edge Function (handles Clerk + Supabase sync)
      const { data: clerkResponse, error: clerkError } = await supabase.functions.invoke('manage-users', {
        method: 'POST',
        body: {
          action: 'createUser',
          data: {
            email: formData.email,
            password: formData.password,
            firstName: formData.firstName,
            lastName: formData.lastName,
          }
        }
      });

      if (clerkError) throw clerkError;

      // Update user in database with role and employer
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      const { error: dbError } = await supabase
        .from('users')
        .upsert({
          email: formData.email,
          role_id: formData.roleId ? parseInt(formData.roleId) : null,
          employer_id: formData.employerId ? parseInt(formData.employerId) : null,
          user_name: fullName || formData.email,
          display_name: fullName || null,
          clerk_user_id: clerkResponse?.id,
        }, {
          onConflict: 'email'
        });

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: `User ${formData.email} has been created successfully.`,
      });

      resetForm();
      onClose();
      onUserCreated?.();

    } catch (error) {
      console.error('Error creating user:', error);
      const errorMessage = error instanceof Error 
        ? error.message.includes("user_already_exists")
          ? "This email is already registered. Please use a different email address."
          : error.message
        : "Failed to create user";
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Determine if employer selection should be shown (not for super admins)
  const selectedRole = roles?.find(r => r.role_id === parseInt(formData.roleId));
  const shouldShowEmployer = formData.roleId && selectedRole?.role_name !== 'mend_super_admin';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create New User
          </DialogTitle>
          <DialogDescription>
            Add a new user to the system. They will be able to sign in immediately with these credentials.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Doe"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address <span className="text-red-500">*</span></Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password <span className="text-red-500">*</span></Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter a secure password"
                required
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">
                Minimum 8 characters. User can change this after signing in.
              </p>
            </div>

            {/* Role Selection */}
            <div className="space-y-2">
              <Label htmlFor="role">User Role <span className="text-red-500">*</span></Label>
              <Select
                value={formData.roleId}
                onValueChange={(value) => setFormData({ ...formData, roleId: value })}
                required
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles?.map((role) => (
                    <SelectItem key={role.role_id} value={role.role_id.toString()}>
                      {role.role_label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Employer Selection - Only show for non-super-admin roles */}
            {shouldShowEmployer && (
              <div className="space-y-2">
                <Label htmlFor="employer">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Company / Employer
                  </div>
                </Label>
                <Select
                  value={formData.employerId}
                  onValueChange={(value) => setFormData({ ...formData, employerId: value })}
                >
                  <SelectTrigger id="employer">
                    <SelectValue placeholder="Select a company (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Company (Mend Staff)</SelectItem>
                    {employers?.map((employer) => (
                      <SelectItem 
                        key={employer.employer_id} 
                        value={employer.employer_id.toString()}
                      >
                        {employer.employer_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Assign to a company for data access control (RLS)
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.email || !formData.password || !formData.roleId}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create User
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
