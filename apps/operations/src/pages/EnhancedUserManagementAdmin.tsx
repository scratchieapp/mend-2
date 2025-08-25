import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MenuBar } from "@/components/MenuBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { EnhancedAddUserDialog } from "@/components/user-management/EnhancedAddUserDialog";
import { 
  UserCog, 
  Search, 
  Edit, 
  Trash2, 
  Building2,
  Shield,
  Mail,
  User
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface UserWithDetails {
  user_id: string;
  email: string;
  user_name?: string;
  role_id: number;
  employer_id?: number;
  created_at: string;
  clerk_user_id?: string;
  role?: {
    role_name: string;
    role_label: string;
  };
  employer?: {
    employer_name: string;
  };
}

interface UserRole {
  role_id: number;
  role_name: string;
  role_label: string;
}

interface Employer {
  employer_id: number;
  employer_name: string;
}

export default function EnhancedUserManagementAdmin() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithDetails | null>(null);
  const [editFormData, setEditFormData] = useState({
    roleId: "",
    employerId: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch users with their roles and employers
  const { data: users, isLoading } = useQuery({
    queryKey: ['users-with-details'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          user_roles!users_role_id_fkey (
            role_name,
            role_label
          ),
          employers!users_employer_id_fkey (
            employer_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map the data to match our interface
      return data.map(user => ({
        ...user,
        role: user.user_roles,
        employer: user.employers
      })) as UserWithDetails[];
    }
  });

  // Fetch roles for the edit dialog
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

  // Fetch employers for the edit dialog
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

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, roleId, employerId }: { 
      userId: string; 
      roleId: number; 
      employerId: number | null;
    }) => {
      const { error } = await supabase
        .from('users')
        .update({
          role_id: roleId,
          employer_id: employerId
        })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-details'] });
      toast({
        title: "Success",
        description: "User has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update user: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // First, try to delete from Clerk if they have a clerk_user_id
      const user = users?.find(u => u.user_id === userId);
      if (user?.clerk_user_id) {
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
      queryClient.invalidateQueries({ queryKey: ['users-with-details'] });
      toast({
        title: "Success",
        description: "User has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete user: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handleEdit = (user: UserWithDetails) => {
    setSelectedUser(user);
    setEditFormData({
      roleId: user.role_id.toString(),
      employerId: user.employer_id?.toString() || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = () => {
    if (!selectedUser) return;

    updateUserMutation.mutate({
      userId: selectedUser.user_id,
      roleId: parseInt(editFormData.roleId),
      employerId: editFormData.employerId ? parseInt(editFormData.employerId) : null,
    });
  };

  const getRoleBadgeColor = (roleId: number) => {
    switch (roleId) {
      case 1: return "destructive"; // Super Admin - Red
      case 2: return "default"; // Account Manager
      case 3: return "secondary"; // Data Entry
      case 5: return "outline"; // Builder Admin
      default: return "secondary";
    }
  };

  const filteredUsers = users?.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.employer?.employer_name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Admin', href: '/admin' },
    { label: 'User Management' }
  ];

  return (
    <div className="min-h-screen bg-background">
      <MenuBar />
      <DashboardHeader
        title="User Management"
        description="Manage user accounts, roles, and company assignments"
        breadcrumbItems={breadcrumbItems}
        customActions={
          <Badge variant="secondary">
            {users?.length || 0} Total Users
          </Badge>
        }
      />

      <div className="container mx-auto py-8 px-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <div className="relative w-96">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  className="pl-10"
                  placeholder="Search by name, email, or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <EnhancedAddUserDialog onUserCreated={() => {
                queryClient.invalidateQueries({ queryKey: ['users-with-details'] });
              }} />
            </div>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {user.user_name || 'Unknown'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeColor(user.role_id)}>
                          <Shield className="h-3 w-3 mr-1" />
                          {user.role?.role_label || 'Unknown Role'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.employer ? (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {user.employer.employer_name}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No Company</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete ${user.email}?`)) {
                                deleteUserMutation.mutate(user.user_id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user role and company assignment for {selectedUser?.email}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-role">User Role</Label>
                <Select
                  value={editFormData.roleId}
                  onValueChange={(value) => setEditFormData({ ...editFormData, roleId: value })}
                >
                  <SelectTrigger id="edit-role">
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

              {editFormData.roleId !== "1" && ( // Don't show employer for Super Admin
                <div className="space-y-2">
                  <Label htmlFor="edit-employer">Company/Employer</Label>
                  <Select
                    value={editFormData.employerId}
                    onValueChange={(value) => setEditFormData({ ...editFormData, employerId: value })}
                  >
                    <SelectTrigger id="edit-employer">
                      <SelectValue placeholder="Select a company" />
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
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateUser}>
                Update User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}