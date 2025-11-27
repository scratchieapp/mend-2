import { Input } from "@/components/ui/input";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, UserCog } from "lucide-react";
import { useState } from "react";
import { EnhancedAddUserDialog } from "@/components/user-management/EnhancedAddUserDialog";
import { EditUserDialog } from "@/components/user-management/EditUserDialog";
import { UsersTable } from "@/components/user-management/UsersTable";
import { User } from "@/types/user";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";

export default function UserManagementAdmin() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { userId: clerkUserId } = useClerkAuth();

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  // Fetch users with RLS filtering by role/employer
  const { data: users, isLoading } = useQuery({
    queryKey: ['users-with-details', clerkUserId],
    enabled: !!clerkUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_users_for_current_user', {
          p_clerk_user_id: clerkUserId || ''
        });
      
      if (error) {
        console.error('Error fetching users:', error);
        throw error;
      }
      
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

  const filteredUsers = users?.filter((user: User) => 
    (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (user.display_name && user.display_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (user.employer?.employer_name && user.employer.employer_name.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      
      <div className="pt-16 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <UserCog className="h-8 w-8" />
                User Management
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Create, edit, and delete user accounts. For an overview with stats and filters, see{" "}
                <a href="/admin/users" className="text-primary hover:underline">User Directory</a>.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary">
                {users?.length || 0} Total Users
              </Badge>
              <EnhancedAddUserDialog onUserCreated={() => {
                queryClient.invalidateQueries({ queryKey: ['users-with-details'] });
              }} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="relative w-96">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  className="pl-10"
                  placeholder="Search by name, email, or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <UsersTable
              users={filteredUsers}
              isLoading={isLoading}
              onEditUser={handleEditUser}
            />
          </div>
        </div>
      </div>

      <EditUserDialog 
        user={selectedUser} 
        open={editDialogOpen} 
        onOpenChange={setEditDialogOpen} 
      />
    </div>
  );
}
