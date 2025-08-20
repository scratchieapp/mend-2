import { MenuBar } from "@/components/MenuBar";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, UserCog } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { AddUserDialog } from "@/components/user-management/AddUserDialog";
import { UsersTable } from "@/components/user-management/UsersTable";
import { User } from "@/types/user";
import { supabase } from "@/integrations/supabase/client";

export default function UserManagementAdmin() {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch users using the Edge Function
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      console.log('Fetching users...');
      const { data, error } = await supabase.functions.invoke('manage-users', {
        method: 'POST',
        body: { action: 'listUsers' }
      });
      
      if (error) {
        console.error('Error fetching users:', error);
        throw error;
      }
      
      console.log('Received users data:', data);
      return Array.isArray(data) ? data : [];
    }
  });

  // Create new user mutation
  const createUserMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        method: 'POST',
        body: {
          action: 'createUser',
          data: { email, password }
        }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: "User created successfully",
        description: "The new user has been added to the system.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error creating user",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update user role mutation
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        method: 'POST',
        body: {
          action: 'updateUserRole',
          data: { userId, role }
        }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: "User role updated",
        description: "The user's role has been successfully updated.",
      });
    }
  });

  // Deactivate user mutation
  const deactivateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        method: 'POST',
        body: {
          action: 'deleteUser',
          data: { userId }
        }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: "User deactivated",
        description: "The user has been successfully deactivated.",
      });
    }
  });

  const filteredUsers = users?.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.user_metadata?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <MenuBar />
      <div className="pt-16 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <UserCog className="h-8 w-8" />
                User Management
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Manage user accounts and permissions
              </p>
            </div>
            <AddUserDialog createUserMutation={createUserMutation} />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="relative w-96">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  className="pl-10"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <UsersTable
              users={filteredUsers}
              isLoading={isLoading}
              updateUserRoleMutation={updateUserRoleMutation}
              deactivateUserMutation={deactivateUserMutation}
            />
          </div>
        </div>
      </div>
    </div>
  );
}