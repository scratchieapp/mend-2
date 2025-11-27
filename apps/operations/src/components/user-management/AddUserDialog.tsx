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
      // Pre-register user in database with role and employer
      // They'll create their Clerk account when they first sign in
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      
      // Generate a UUID for the user_id (required field)
      const userId = crypto.randomUUID();
      
      const { error: dbError } = await supabase
        .from('users')
        .insert({
          user_id: userId,
          email: formData.email,
          role_id: formData.roleId ? parseInt(formData.roleId) : null,
          employer_id: formData.employerId || null, // Keep as string, not number
          display_name: fullName || formData.email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (dbError) {
        // Check for duplicate email
        if (dbError.code === '23505' || dbError.message?.includes('duplicate')) {
          throw new Error('A user with this email already exists');
        }
        throw dbError;
      }

      toast({
        title: "User Pre-Registered",
        description: `${formData.email} has been added. They can now sign up at the login page to activate their account.`,
      });

      resetForm();
      onClose();
      onUserCreated?.();

    } catch (error) {
      console.error('Error creating user:', error);
      const errorMessage = error instanceof Error 
        ? error.message
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
            Pre-Register User
          </DialogTitle>
          <DialogDescription>
            Pre-register a user with their role and company. They will complete signup when they first sign in.
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
              <p className="text-xs text-muted-foreground">
                User will sign up with this email to activate their account.
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
                  value={formData.employerId || "none"}
                  onValueChange={(value) => setFormData({ ...formData, employerId: value === "none" ? "" : value })}
                >
                  <SelectTrigger id="employer">
                    <SelectValue placeholder="Select a company (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Company (Mend Staff)</SelectItem>
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
            <Button type="submit" disabled={isLoading || !formData.email || !formData.roleId}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add User
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
