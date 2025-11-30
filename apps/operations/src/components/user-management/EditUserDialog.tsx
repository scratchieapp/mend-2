import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { User } from "@/types/user";
import { Trash2, Phone } from "lucide-react";

interface EditUserDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditUserDialog({ user, open, onOpenChange }: EditUserDialogProps) {
  const { toast } = useToast();
  const { userId: clerkUserId } = useClerkAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    display_name: "",
    role_id: "",
    employer_id: "null", // "null" string for 'None' option
    mobile_number: "",
  });

  // Reset form when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        display_name: user.display_name || user.user_name || "",
        role_id: user.role_id?.toString() || "",
        employer_id: user.employer_id?.toString() || "null",
        mobile_number: user.mobile_number || "",
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

      // Check for valid user ID (fallback to 'id' if 'user_id' is missing)
      const userId = user.user_id || (user as any).id;
      
      if (!userId || userId === 'undefined') {
        console.error("User object missing ID:", user);
        throw new Error("Invalid user ID: User object missing ID field");
      }

      console.log("Updating user:", userId, data);

      // Use RPC function to bypass RLS (uses Clerk auth)
      const { data: rpcResult, error: rpcError } = await supabase.rpc('admin_update_user', {
        p_clerk_user_id: clerkUserId || '',
        p_user_id: userId,
        p_display_name: data.display_name || null,
        p_role_id: data.role_id ? parseInt(data.role_id) : null,
        p_employer_id: data.employer_id === "null" ? null : data.employer_id || null,
        p_mobile_number: data.mobile_number || null,
      });

      if (rpcError) throw rpcError;

      // Check the RPC result for success
      const result = rpcResult as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || "Update failed");
      }

      console.log("Update successful:", result);

      // 2. Call Edge Function to sync role if needed (Clerk sync)
      if (data.role_id && parseInt(data.role_id) !== user.role_id) {
        const role = roles.find(r => r.role_id === parseInt(data.role_id));
        if (role) {
          const { error: functionError } = await supabase.functions.invoke('manage-users', {
            method: 'POST',
            body: {
              action: 'updateUserRole',
              data: { 
                userId: userId, 
                role: role.role_name 
              }
            }
          });
          if (functionError) {
            console.warn("Failed to sync role to Clerk:", functionError);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users-with-details'] });
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

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      
      const userId = user.user_id || (user as any).id;
      
      // First, try to delete from Clerk if they have a clerk_user_id
      if (user.clerk_user_id) {
        await supabase.functions.invoke('manage-users', {
          method: 'POST',
          body: {
            action: 'deleteUser',
            data: { userId: user.clerk_user_id }
          }
        });
      }

      // Then delete from database
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users-with-details'] });
      toast({
        title: "Success",
        description: "User has been deleted successfully.",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete user: ${error.message}`,
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
            <Label htmlFor="mobile_number">Mobile Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                id="mobile_number" 
                type="tel"
                placeholder="0412 345 678"
                className="pl-10"
                value={formData.mobile_number} 
                onChange={(e) => setFormData({...formData, mobile_number: e.target.value})}
              />
            </div>
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

          <DialogFooter className="flex justify-between sm:justify-between">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete User
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the user
                    account for <strong>{user.email}</strong> and remove their data from
                    the system.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteUserMutation.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteUserMutation.isPending ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateUserMutation.isPending}>
                {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
