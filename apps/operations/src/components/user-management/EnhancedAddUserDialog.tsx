import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { UserPlus, Building2 } from "lucide-react";
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

interface EnhancedAddUserDialogProps {
  onUserCreated: () => void;
}

export function EnhancedAddUserDialog({ onUserCreated }: EnhancedAddUserDialogProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // First, create the user in Clerk via the Edge Function
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

      // Then, create or update the user in the database with the role and employer
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      const { error: dbError } = await supabase
        .from('users')
        .upsert({
          email: formData.email,
          role_id: parseInt(formData.roleId),
          employer_id: formData.employerId ? parseInt(formData.employerId) : null,
          user_name: fullName || formData.email,
          clerk_user_id: clerkResponse.id,
        }, {
          onConflict: 'email'
        });

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: `User ${formData.email} has been created successfully.`,
      });

      // Reset form and close dialog
      setFormData({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        roleId: "",
        employerId: "",
      });
      setIsOpen(false);
      onUserCreated();

    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create user",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Determine if employer selection should be shown
  const shouldShowEmployer = formData.roleId && 
    roles?.find(r => r.role_id === parseInt(formData.roleId))?.role_name !== 'mend_super_admin';

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Add User
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Add a new user to the system with role and company assignment.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
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

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Temporary Password *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter a secure password"
                required
              />
              <p className="text-xs text-muted-foreground">
                User will be prompted to change this on first login
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">User Role *</Label>
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

            {shouldShowEmployer && (
              <div className="space-y-2">
                <Label htmlFor="employer">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Company/Employer
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
                    <SelectItem value="">No Company</SelectItem>
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
                  Assign this user to a specific company for data access control
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}