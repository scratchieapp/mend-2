import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { UserData, UserRole } from "@/types/auth";
import { getAvailableRolesToCreate } from "@/lib/auth/roles";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MenuBar } from "@/components/MenuBar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Search, Filter, Building2, Shield, Edit, Trash2, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddUserDialog } from "@/components/user-management/AddUserDialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

interface Employer {
  employer_id: number;
  employer_name: string;
}

interface UserWithEmployers extends UserData {
  employers?: Employer[];
}

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [users, setUsers] = useState<UserWithEmployers[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserWithEmployers | null>(null);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [showAssignEmployerDialog, setShowAssignEmployerDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [employerFilter, setEmployerFilter] = useState<string>("all");
  const { toast } = useToast();

  // Combined fetch function for all data
  const fetchAdminUsersData = async () => {
    try {
      // Fetch users with their roles and employer assignments
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select(`
          user_id,
          display_name,
          email,
          created_at,
          role_id,
          employer_id,
          user_roles (
            role_id,
            role_name,
            role_label
          )
        `)
        .order("created_at", { ascending: false });

      if (usersError) throw usersError;

      // Fetch roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("*")
        .order("role_id");

      if (rolesError) throw rolesError;

      // Fetch employers
      const { data: employersData, error: employersError } = await supabase
        .from("employers")
        .select("employer_id, employer_name")
        .order("employer_name");

      if (employersError) throw employersError;

      return {
        users: (usersData || []) as UserWithEmployers[],
        roles: (rolesData || []) as UserRole[],
        employers: (employersData || []) as Employer[]
      };
    } catch (error) {
      console.error('Error fetching admin users data:', error);
      throw error;
    }
  };

  // Single query to fetch all data
  const { data: adminData, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-users-data'],
    queryFn: fetchAdminUsersData,
    retry: 1,
    retryDelay: 1000,
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    if (adminData) {
      setUsers(adminData.users);
      setRoles(adminData.roles);
      setEmployers(adminData.employers);
    }
  }, [adminData]);

  const queryClient = useQueryClient();

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async ({ email, password, role }: { email: string; password: string; role: string }) => {
      const roleId = roles.find(r => r.role_name === role)?.role_id;
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        user_metadata: {
          role_id: roleId,
          role: role,
          user_name: email.split('@')[0]
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-data'] });
      toast({
        title: "Success",
        description: "User has been created successfully.",
      });
      setShowAddUserDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  // Update user role mutation
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: number }) => {
      const { error } = await supabase
        .from("users")
        .update({ role_id: roleId })
        .eq("user_id", userId);

      if (error) throw error;
      return { userId, roleId };
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Success",
        description: "User role has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update user role.",
        variant: "destructive",
      });
    },
  });

  // Assign employer to user mutation
  const assignEmployerMutation = useMutation({
    mutationFn: async ({ userId, employerId }: { userId: string; employerId: number | null }) => {
      const { error } = await supabase
        .from("users")
        .update({ employer_id: employerId })
        .eq("user_id", userId);

      if (error) throw error;
      return { userId, employerId };
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Success",
        description: "Employer assignment updated successfully.",
      });
      setShowAssignEmployerDialog(false);
      setSelectedUser(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to assign employer.",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // In a real app, you'd properly deactivate/delete the user
      const { error } = await supabase
        .from("users")
        .update({ is_active: false })
        .eq("user_id", userId);

      if (error) throw error;
      return userId;
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Success",
        description: "User has been deactivated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to deactivate user.",
        variant: "destructive",
      });
    },
  });

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.display_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === "all" || 
      user.role_id?.toString() === roleFilter;
    
    const matchesEmployer = employerFilter === "all" || 
      user.employer_id === employerFilter;
    
    return matchesSearch && matchesRole && matchesEmployer;
  });

  const getRoleBadgeColor = (roleId: number) => {
    switch (roleId) {
      case 1: return "bg-purple-600 text-white";
      case 2: return "bg-blue-600 text-white";
      case 3: return "bg-green-600 text-white";
      case 4: return "bg-orange-600 text-white";
      case 5: return "bg-red-600 text-white";
      default: return "bg-gray-600 text-white";
    }
  };

  const getEmployerName = (employerId: string | number | null) => {
    if (!employerId) return "Not Assigned";
    const employer = employers.find(e => e.employer_id.toString() === employerId.toString());
    return employer?.employer_name || "Unknown";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading user management...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            {error instanceof Error ? error.message : 'Failed to load data'}
          </div>
          <Button onClick={() => refetch()} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const availableRoles = userData ? getAvailableRolesToCreate(userData) : [];

  return (
    <div className="min-h-screen bg-background">
      <MenuBar />
      <div className="container mx-auto px-4 py-8 pt-20">
        {/* Breadcrumb */}
        <div className="text-sm text-muted-foreground mb-6">
          Super Admin / User Management
        </div>

        {/* Page Header */}
        <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            User Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage user accounts, roles, and employer assignments
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="px-3 py-1">
            {users.length} Total Users
          </Badge>
          <Button onClick={() => setShowAddUserDialog(true)} className="bg-primary hover:bg-primary/90">
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Super Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.role_id === 1).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Assigned to Employers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.employer_id).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Employers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employers.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map(role => (
                  <SelectItem key={role.role_id} value={role.role_id.toString()}>
                    {role.role_label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={employerFilter} onValueChange={setEmployerFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by employer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employers</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {employers.map(employer => (
                  <SelectItem key={employer.employer_id} value={employer.employer_id.toString()}>
                    {employer.employer_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            Click on a user to edit their details or assign employers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Employer</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.user_id} className="hover:bg-muted/50">
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.display_name || 'N/A'}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getRoleBadgeColor(user.role_id || 0)}>
                      {roles.find(r => r.role_id === user.role_id)?.role_label || 'Unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="flex items-center gap-1 w-fit">
                      <Building2 className="h-3 w-3" />
                      {getEmployerName(user.employer_id)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.created_at ? format(new Date(user.created_at), 'MMM d, yyyy') : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowAssignEmployerDialog(true);
                        }}
                      >
                        <Building2 className="h-4 w-4" />
                      </Button>
                      <Select
                        value={user.role_id?.toString()}
                        onValueChange={(value) => {
                          updateUserRoleMutation.mutate({
                            userId: user.user_id,
                            roleId: parseInt(value)
                          });
                        }}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map(role => (
                            <SelectItem key={role.role_id} value={role.role_id.toString()}>
                              {role.role_label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm('Are you sure you want to deactivate this user?')) {
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
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      {showAddUserDialog && (
        <AddUserDialog
          createUserMutation={createUserMutation}
          availableRoles={availableRoles}
          open={showAddUserDialog}
          onClose={() => setShowAddUserDialog(false)}
        />
      )}

      {/* Assign Employer Dialog */}
      <Dialog open={showAssignEmployerDialog} onOpenChange={setShowAssignEmployerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Employer</DialogTitle>
            <DialogDescription>
              Assign {selectedUser?.display_name || selectedUser?.email} to an employer for RLS access control.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Select Employer</Label>
            <Select
              value={selectedUser?.employer_id?.toString() || ""}
              onValueChange={(value) => {
                if (selectedUser) {
                  assignEmployerMutation.mutate({
                    userId: selectedUser.user_id,
                    employerId: value === "none" ? null : parseInt(value)
                  });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an employer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Employer (Remove Assignment)</SelectItem>
                {employers.map(employer => (
                  <SelectItem key={employer.employer_id} value={employer.employer_id.toString()}>
                    {employer.employer_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignEmployerDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}