import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { EnhancedAddUserDialog } from "@/components/user-management/EnhancedAddUserDialog";
import { BulkUserImportDialog } from "@/components/user-management/BulkUserImportDialog";
import { EditUserDialog } from "@/components/user-management/EditUserDialog";
import { UsersTable } from "@/components/user-management/UsersTable";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { User } from "@/types/user";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";

export default function EnhancedUserManagementAdmin() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { userId: clerkUserId } = useClerkAuth();

  const queryClient = useQueryClient();

  // Fetch users with RLS filtering by role/employer
  const { data: users, isLoading } = useQuery({
    queryKey: ['users-with-details', clerkUserId],
    enabled: !!clerkUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_users_for_current_user', {
          p_clerk_user_id: clerkUserId || ''
        });

      if (error) throw error;
      
      // Map the flat RPC result to match our User interface
      return (data || []).map((user: any) => ({
        user_id: user.user_id,
        display_name: user.display_name,
        email: user.email,
        created_at: user.created_at,
        role_id: user.role_id,
        employer_id: user.employer_id,
        role: user.role_name ? {
          role_id: user.role_id,
          role_name: user.role_name,
          role_label: user.role_label
        } : null,
        employer: user.employer_name ? {
          employer_id: user.employer_id,
          employer_name: user.employer_name
        } : null
      })) as User[];
    }
  });

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };

  const filteredUsers = users?.filter(user =>
    (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (user.display_name && user.display_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (user.employer?.employer_name && user.employer.employer_name.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Admin', href: '/admin' },
    { label: 'User Management' }
  ];

  return (
    <div className="min-h-screen bg-background">
      
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
              <div className="flex items-center gap-2">
                <BulkUserImportDialog onUsersCreated={() => {
                  queryClient.invalidateQueries({ queryKey: ['users-with-details'] });
                }} />
                <EnhancedAddUserDialog onUserCreated={() => {
                  queryClient.invalidateQueries({ queryKey: ['users-with-details'] });
                }} />
              </div>
            </div>
          </div>

          <div className="p-6">
            <UsersTable
              users={filteredUsers}
              isLoading={isLoading}
              onEditUser={handleEditUser}
            />
          </div>
        </div>

        <EditUserDialog 
          user={selectedUser} 
          open={isEditDialogOpen} 
          onOpenChange={setIsEditDialogOpen} 
        />
      </div>
    </div>
  );
}
