import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { User } from "@/types/user";

interface EditUserDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditUserDialog({ user, open, onOpenChange }: EditUserDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    display_name: "",
    role_id: "",
    employer_id: "null", // "null" string for 'None' option
  });

  // Reset form when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        display_name: user.display_name || "",
        role_id: user.role_id?.toString() || "",
        employer_id: user.employer_id?.toString() || "null",
      });
    }
  }, [user]);

  // Fetch roles
  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('role_id');
      if (error) throw error;
      return data;
    },
    enabled: open
  });

  // Fetch employers
  const { data: employers = [] } = useQuery({
    queryKey: ['employers-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employers')
        .select('employer_id, employer_name')
        .order('employer_name');
      if (error) throw error;
      return data;
    },
    enabled: open
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user) return;

      // 1. Update basic details in Supabase
      const updates: any = {
        display_name: data.display_name,
        employer_id: data.employer_id === "null" ? null : parseInt(data.employer_id),
        // Update role_id directly in table as well, to ensure consistency
        role_id: parseInt(data.role_id),
      };

      const { error: dbError } = await supabase
        .from('users')
        .update(updates)
        .eq('user_id', user.user_id);

      if (dbError) throw dbError;

      // 2. Call Edge Function to sync role if needed (Clerk sync)
      // This handles the 'updateUserRole' action which might sync to Clerk
      if (data.role_id && parseInt(data.role_id) !== user.role_id) {
        // Find role name from ID
        const role = roles.find(r => r.role_id === parseInt(data.role_id));
        if (role) {
          const { error: functionError } = await supabase.functions.invoke('manage-users', {
            method: 'POST',
            body: {
              action: 'updateUserRole',
              data: { 
                userId: user.user_id, 
                role: role.role_name 
              }
            }
          });
          if (functionError) {
            console.warn("Failed to sync role to Clerk:", functionError);
            // Don't throw here if DB update succeeded, just warn
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update user: " + error.message,
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserMutation.mutate(formData);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user details, role, and company assignment.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user.email || ""} disabled className="bg-muted" />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="display_name">Display Name</Label>
            <Input 
              id="display_name" 
              value={formData.display_name} 
              onChange={(e) => setFormData({...formData, display_name: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select 
              value={formData.role_id} 
              onValueChange={(val) => setFormData({...formData, role_id: val})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.role_id} value={role.role_id.toString()}>
                    {role.role_label || role.role_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="employer">Company / Employer</Label>
            <Select 
              value={formData.employer_id} 
              onValueChange={(val) => setFormData({...formData, employer_id: val})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an employer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="null">None (Mend Staff)</SelectItem>
                {employers.map((emp) => (
                  <SelectItem key={emp.employer_id} value={emp.employer_id.toString()}>
                    {emp.employer_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateUserMutation.isPending}>
              {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

