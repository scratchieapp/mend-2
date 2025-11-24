import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { assignUserToEmployer, removeUserFromEmployer, getUserEmployers } from '@/lib/supabase/metrics';
import {
  User,
  Building2,
  Shield,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  ChevronLeft,
  UserPlus,
  Users,
  AlertTriangle,
  Check,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth/AuthContext';

interface UserData {
  user_id: string;
  email: string;
  display_name: string;
  custom_display_name: string;
  role_id: number;
  employer_id: number | null;
  created_at: string;
  last_seen_at: string;
  clerk_user_id: string;
}

interface Employer {
  employer_id: number;
  employer_name: string;
  is_primary?: boolean;
}

interface UserRole {
  role_id: number;
  role_name: string;
  role_label: string;
  role_description: string;
}

const SuperUserManagement = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { userData } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [employerDialogOpen, setEmployerDialogOpen] = useState(false);
  const [selectedEmployers, setSelectedEmployers] = useState<number[]>([]);
  const [primaryEmployer, setPrimaryEmployer] = useState<number | null>(null);

  // Check if user is Super Admin
  useEffect(() => {
    if (userData && userData.role_id !== 1) {
      toast({
        title: "Access Denied",
        description: "Only Super Admins can access user management",
        variant: "destructive"
      });
      navigate('/dashboard');
    }
  }, [userData, navigate]);

  // Fetch all users
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as UserData[];
    }
  });

  // Fetch all employers
  const { data: employers = [], isLoading: isLoadingEmployers } = useQuery({
    queryKey: ['all-employers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employers')
        .select('employer_id, employer_name')
        .order('employer_name');

      if (error) throw error;
      return data as Employer[];
    }
  });

  // Fetch all roles
  const { data: roles = [], isLoading: isLoadingRoles } = useQuery({
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

  // Fetch user's assigned employers
  const { data: userEmployers = [], refetch: refetchUserEmployers } = useQuery({
    queryKey: ['user-employers', selectedUser?.user_id],
    queryFn: async () => {
      if (!selectedUser) return [];
      return await getUserEmployers(selectedUser.user_id);
    },
    enabled: !!selectedUser
  });

  // Update user role mutation
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: number }) => {
      const { error } = await supabase
        .from('users')
        .update({ role_id: roleId })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast({
        title: "Success",
        description: "User role updated successfully"
      });
      setEditDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive"
      });
      console.error('Error updating user role:', error);
    }
  });

  // Assign employer mutation
  const assignEmployerMutation = useMutation({
    mutationFn: async ({ userId, employerIds, primaryId }: { 
      userId: string; 
      employerIds: number[]; 
      primaryId: number | null 
    }) => {
      // Remove all existing assignments first
      const currentAssignments = userEmployers.map(e => e.employer_id);
      for (const empId of currentAssignments) {
        await removeUserFromEmployer(userId, empId);
      }

      // Add new assignments
      for (const empId of employerIds) {
        await assignUserToEmployer(
          userId,
          empId,
          empId === primaryId,
          userData?.user_id
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-employers'] });
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast({
        title: "Success",
        description: "Employer assignments updated successfully"
      });
      setEmployerDialogOpen(false);
      refetchUserEmployers();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update employer assignments",
        variant: "destructive"
      });
      console.error('Error updating employer assignments:', error);
    }
  });

  // Filter users based on search and role
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' || 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.custom_display_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || user.role_id === parseInt(roleFilter);

    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (roleId: number) => {
    const role = roles.find(r => r.role_id === roleId);
    if (!role) return <Badge variant="outline">Unknown</Badge>;

    const colors: Record<number, string> = {
      1: 'bg-purple-100 text-purple-800 border-purple-300',
      2: 'bg-blue-100 text-blue-800 border-blue-300',
      3: 'bg-green-100 text-green-800 border-green-300',
      4: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      5: 'bg-orange-100 text-orange-800 border-orange-300',
      6: 'bg-pink-100 text-pink-800 border-pink-300',
      7: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      8: 'bg-red-100 text-red-800 border-red-300',
      9: 'bg-gray-100 text-gray-800 border-gray-300',
    };

    return (
      <Badge className={colors[roleId] || 'bg-gray-100 text-gray-800'}>
        {role.role_label}
      </Badge>
    );
  };

  const openEmployerDialog = (user: UserData) => {
    setSelectedUser(user);
    setEmployerDialogOpen(true);
    
    // Set initial selected employers from current assignments
    const currentEmployerIds = userEmployers.map(e => e.employer_id);
    setSelectedEmployers(currentEmployerIds);
    
    const primary = userEmployers.find(e => e.is_primary);
    setPrimaryEmployer(primary?.employer_id || null);
  };

  useEffect(() => {
    if (userEmployers && userEmployers.length > 0) {
      const currentEmployerIds = userEmployers.map(e => e.employer_id);
      setSelectedEmployers(currentEmployerIds);
      
      const primary = userEmployers.find(e => e.is_primary);
      setPrimaryEmployer(primary?.employer_id || null);
    }
  }, [userEmployers]);

  if (isLoadingUsers || isLoadingEmployers || isLoadingRoles) {
    return (
      <div className="min-h-screen bg-background">
        
        <div className="pt-16 p-8">
          <div className="max-w-7xl mx-auto">
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-3">Loading user data...</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      
      <div className="pt-16 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/admin')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Super User Management</h1>
                <p className="text-muted-foreground">
                  Manage all users, roles, and company assignments
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              <Users className="h-5 w-5 mr-2" />
              {users.length} Total Users
            </Badge>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4">
              <div className="flex-1">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-64">
                <Label>Role Filter</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Roles" />
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
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Platform Users</CardTitle>
              <CardDescription>
                View and manage all users across the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Assigned Companies</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map(user => {
                    const assignedEmployers = userEmployers
                      .filter(ue => ue.employer_id === user.employer_id)
                      .map(ue => employers.find(e => e.employer_id === ue.employer_id))
                      .filter(Boolean);

                    return (
                      <TableRow key={user.user_id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">
                                {user.custom_display_name || user.display_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getRoleBadge(user.role_id)}
                        </TableCell>
                        <TableCell>
                          {user.role_id <= 2 ? (
                            <Badge variant="secondary" className="bg-purple-50">
                              All Companies (MEND Staff)
                            </Badge>
                          ) : assignedEmployers.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {assignedEmployers.slice(0, 2).map(emp => (
                                <Badge key={emp?.employer_id} variant="outline">
                                  {emp?.employer_name}
                                </Badge>
                              ))}
                              {assignedEmployers.length > 2 && (
                                <Badge variant="secondary">
                                  +{assignedEmployers.length - 2} more
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <Badge variant="destructive" className="bg-red-50">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              No Assignment
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.last_seen_at 
                            ? new Date(user.last_seen_at).toLocaleDateString()
                            : 'Never'
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedUser(user);
                                setEditDialogOpen(true);
                              }}
                            >
                              <Edit2 className="h-3 w-3 mr-1" />
                              Role
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEmployerDialog(user)}
                            >
                              <Building2 className="h-3 w-3 mr-1" />
                              Companies
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Role Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update the role for {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>New Role</Label>
              <Select
                value={selectedUser?.role_id?.toString()}
                onValueChange={(value) => {
                  if (selectedUser) {
                    setSelectedUser({ ...selectedUser, role_id: parseInt(value) });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(role => (
                    <SelectItem key={role.role_id} value={role.role_id.toString()}>
                      <div>
                        <div className="font-medium">{role.role_label}</div>
                        <div className="text-sm text-muted-foreground">
                          {role.role_description}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedUser) {
                  updateUserRoleMutation.mutate({
                    userId: selectedUser.user_id,
                    roleId: selectedUser.role_id
                  });
                }
              }}
              disabled={updateUserRoleMutation.isPending}
            >
              {updateUserRoleMutation.isPending ? 'Updating...' : 'Update Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Employer Assignment Dialog */}
      <Dialog open={employerDialogOpen} onOpenChange={setEmployerDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Company Assignments</DialogTitle>
            <DialogDescription>
              Assign {selectedUser?.email} to one or more companies
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
            {selectedUser?.role_id && selectedUser.role_id <= 2 ? (
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-2 text-purple-800">
                  <Shield className="h-5 w-5" />
                  <span className="font-medium">MEND Staff Member</span>
                </div>
                <p className="text-sm text-purple-600 mt-1">
                  This user has access to all companies by default
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Select Companies</Label>
                  <div className="text-sm text-muted-foreground mb-2">
                    Users can be assigned to multiple companies. Select a primary company for default context.
                  </div>
                  {employers.map(employer => (
                    <div key={employer.employer_id} className="flex items-center space-x-3 py-2">
                      <Checkbox
                        checked={selectedEmployers.includes(employer.employer_id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedEmployers([...selectedEmployers, employer.employer_id]);
                            if (!primaryEmployer) {
                              setPrimaryEmployer(employer.employer_id);
                            }
                          } else {
                            setSelectedEmployers(selectedEmployers.filter(id => id !== employer.employer_id));
                            if (primaryEmployer === employer.employer_id) {
                              setPrimaryEmployer(selectedEmployers[0] || null);
                            }
                          }
                        }}
                      />
                      <label className="flex-1 cursor-pointer">
                        {employer.employer_name}
                      </label>
                      {selectedEmployers.includes(employer.employer_id) && (
                        <Button
                          size="sm"
                          variant={primaryEmployer === employer.employer_id ? "default" : "outline"}
                          onClick={() => setPrimaryEmployer(employer.employer_id)}
                        >
                          {primaryEmployer === employer.employer_id ? (
                            <>
                              <Check className="h-3 w-3 mr-1" />
                              Primary
                            </>
                          ) : (
                            'Set Primary'
                          )}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmployerDialogOpen(false)}>
              Cancel
            </Button>
            {selectedUser?.role_id && selectedUser.role_id > 2 && (
              <Button
                onClick={() => {
                  if (selectedUser) {
                    assignEmployerMutation.mutate({
                      userId: selectedUser.user_id,
                      employerIds: selectedEmployers,
                      primaryId: primaryEmployer
                    });
                  }
                }}
                disabled={assignEmployerMutation.isPending || selectedEmployers.length === 0}
              >
                {assignEmployerMutation.isPending ? 'Updating...' : 'Save Assignments'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperUserManagement;