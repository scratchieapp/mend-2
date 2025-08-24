// src/pages/AccountManager.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/lib/auth/authConfig";
import { UserData, UserRole, UserRoleName } from "@/types/auth";
import { getAvailableRolesToCreate } from "@/lib/auth/roles";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AddUserDialog } from "@/components/user-management/AddUserDialog";
import { UsersTable } from "@/components/user-management/UsersTable";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function AccountManager() {
  const navigate = useNavigate();
  const { user: userData } = useAuthContext();
  const [users, setUsers] = useState<UserData[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserData | null | undefined>(null);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const { toast } = useToast();

  // Fetch users with proper field selection
  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("users")
      .select(`
        user_id,
        display_name,
        email,
        created_at,
        role_id,
        user_roles (
          role_id,
          role_name,
          role_label
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as UserData[];
  };

  // Fetch roles
  const fetchRoles = async () => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("*")
      .order("role_id");

    if (error) throw error;
    return data as UserRole[];
  };

  const { data: fetchedUsers, isLoading: isLoadingUsers, error: usersError } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers
  });
  const { data: fetchedRoles, isLoading: isLoadingRoles, error: rolesError } = useQuery({
    queryKey: ['roles'],
    queryFn: fetchRoles
  });

  useEffect(() => {
    if (fetchedUsers) {
      setUsers(fetchedUsers);
    }
    if (fetchedRoles) {
      setRoles(fetchedRoles);
    }
  }, [fetchedUsers, fetchedRoles]);

  const queryClient = useQueryClient();

// Create user mutation
const createUserMutation = useMutation({
  mutationFn: async ({ email, password, role }: { email: string; password: string; role: UserRoleName }) => {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        role_id: roles.find(r => r.role_name === role)?.role_id, // Get role_id from selected role
        role: role, // Set the role name here
        user_name: "Default" // You might want to change this
      },
    });

    if (error) throw error;
    return data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
    toast({
      title: "Success",
      description: "User has been created successfully.",
    });
    setShowAddUserDialog(false);
  },
  onError: (error: Error) => {
    let errorMessage = "Failed to create user. Please try again.";
    if (error?.message?.includes('user_already_exists')) {
      errorMessage = "This email is already registered. Please use a different email address.";
    }
    toast({
      title: "Error",
      description: errorMessage,
      variant: "destructive",
    });
  },
});

  // Update user role mutation
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRoleName }) => {
      const roleId = roles.find(r => r.role_name === role)?.role_id;
      if (!roleId) throw new Error("Role not found.");

      const { error } = await supabase
        .from("users")
        .update({ role_id: roleId })
        .eq("user_id", userId);

      if (error) throw error;
      return { userId, roleId };
    },
    onSuccess: ({ userId, roleId }) => {
      setUsers(users.map(user =>
        user.user_id === userId ? { ...user, role_id: roleId } : user
      ));
      toast({
        title: "Success",
        description: "User role has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update user role. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Deactivate user mutation (placeholder for actual deactivation logic)
  const deactivateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Replace this with your actual user deactivation logic
      // Deactivating user
      return userId;
    },
    onSuccess: (userId) => {
      setUsers(users.filter(user => user.user_id !== userId));
      toast({
        title: "Success",
        description: "User has been deactivated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to deactivate user. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEditUser = (user: UserData) => {
    setSelectedUser(user);
  };

  const handleCloseEdit = () => {
    setSelectedUser(undefined);
  };

  const handleAddUser = () => {
    setShowAddUserDialog(true);
  };

  const handleCloseAddUser = () => {
    setShowAddUserDialog(false);
  };

  const handleUpdateUser = async (updatedUser: UserData) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          display_name: updatedUser.display_name,
          email: updatedUser.email,
          role_id: updatedUser.role_id,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', updatedUser.user_id);

      if (error) throw error;

      // Update the local state to reflect the changes
      setUsers(users.map(u => (u.user_id === updatedUser.user_id ? updatedUser : u)));
      setSelectedUser(null); // Close the edit dialog
      
      toast({
        title: "Success",
        description: "User has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: "Failed to update user. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoadingUsers || isLoadingRoles) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (usersError || rolesError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">
          {usersError instanceof Error ? usersError.message : rolesError instanceof Error ? rolesError.message : 'Failed to load data'}
        </div>
      </div>
    );
  }

  const availableRoles = userData ? getAvailableRolesToCreate(userData) : [];

  const handleBackToDashboard = () => {
    navigate('/admin');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Navigation Header */}
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackToDashboard}
          className="mr-4 p-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="text-sm text-muted-foreground">
          Admin Dashboard / User Management
        </div>
      </div>

      {/* Page Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        <Button onClick={handleAddUser} className="bg-primary hover:bg-primary/90">
          Add User
        </Button>
      </div>

      {/* Add User Dialog */}
      {showAddUserDialog && (
        <AddUserDialog
          createUserMutation={createUserMutation}
          availableRoles={availableRoles}
          open={showAddUserDialog}
          onClose={handleCloseAddUser}
        />
      )}

      {/* Edit User Dialog */}
      <Dialog open={selectedUser !== null} onOpenChange={handleCloseEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <EditUserForm user={selectedUser} onSave={handleUpdateUser} roles={roles} />
          )}
        </DialogContent>
      </Dialog>

      {/* Users Table */}
      <div className="bg-white rounded-lg border shadow-sm">
        <UsersTable
          users={users}
          isLoading={isLoadingUsers}
          updateUserRoleMutation={updateUserRoleMutation}
          deactivateUserMutation={deactivateUserMutation}
          onEditUser={handleEditUser}
        />
      </div>
    </div>
  );
}

// Separate component for the edit user form
interface EditUserFormProps {
  user: UserData;
  onSave: (updatedUser: UserData) => void;
  roles: UserRole[];
}

function EditUserForm({ user, onSave, roles }: EditUserFormProps) {
  const [displayName, setDisplayName] = useState(user.display_name || '');
  const [userEmail, setUserEmail] = useState(user.email || '');
  const [roleId, setRoleId] = useState(user.role_id || 1);

  const handleSave = () => {
    onSave({
      ...user,
      display_name: displayName,
      email: userEmail,
      role_id: roleId,
    });
  };

  return (
    <div className="grid gap-6 py-4">
      <div className="grid gap-2">
        <Label htmlFor="name" className="text-sm font-medium">
          Display Name
        </Label>
        <Input
          id="name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Enter user's display name"
          className="w-full"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email" className="text-sm font-medium">
          Email Address
        </Label>
        <Input
          id="email"
          type="email"
          value={userEmail}
          onChange={(e) => setUserEmail(e.target.value)}
          placeholder="Enter user's email address"
          className="w-full"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="role" className="text-sm font-medium">
          User Role
        </Label>
        <select
          id="role"
          value={roleId}
          onChange={(e) => setRoleId(parseInt(e.target.value, 10))}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {roles.map((role) => (
            <option key={role.role_id} value={role.role_id}>
              {role.role_label} (Level {role.role_id})
            </option>
          ))}
        </select>
      </div>
      <DialogFooter className="pt-4">
        <Button onClick={handleSave} className="w-full sm:w-auto">
          Save Changes
        </Button>
      </DialogFooter>
    </div>
  );
}