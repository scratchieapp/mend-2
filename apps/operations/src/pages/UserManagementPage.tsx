// mend-2/src/pages/UserManagementPage.tsx

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserManagement } from "@/components/users/UserManagement";
import { useAuth } from "@/lib/auth/AuthContext";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { canManageUser } from "@/lib/auth/roles"; // Import from the new roles.ts file
import { UserData, UserRole } from "@/types/auth";

export default function UserManagementPage() {
  const { userData } = useAuth();
  const { userId: clerkUserId } = useClerkAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch users and roles
  useEffect(() => {
    const fetchData = async () => {
      if (!userData || !clerkUserId) return;

      try {
        // Fetch roles first
        const { data: rolesData, error: rolesError } = await supabase
          .from("user_roles")
          .select("*")
          .order("role_id");

        if (rolesError) throw rolesError;
        setRoles(rolesData);

        // Then fetch users using RLS-aware function
        const { data: usersData, error: usersError } = await supabase
          .rpc('get_users_for_current_user', {
            p_clerk_user_id: clerkUserId
          });

        if (usersError) throw usersError;
        
        // Map flat RPC result to UserData structure
        const mappedUsers = (usersData || []).map((user: any) => ({
          ...user,
          user_roles: user.role_name ? {
            role_id: user.role_id,
            role_name: user.role_name,
            role_label: user.role_label
          } : null
        }));
        
        setUsers(mappedUsers);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load users");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userData, clerkUserId]);

  const handleEditUser = (user: UserData) => {
    setSelectedUser(user);
  };

  const handleCloseEdit = () => {
    setSelectedUser(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">User Management</h1>
        <button
          onClick={() => setSelectedUser(null)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Create New User
        </button>
      </div>

      {selectedUser !== undefined && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <UserManagement
              selectedUser={selectedUser}
              onClose={handleCloseEdit}
            />
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => {
              const canManage = userData ? canManageUser(userData, user) : false;
              const userRole = roles.find(
                (role) => role.role_id === user.role_id
              );

              return (
                <tr key={user.user_id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.user_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.user_email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {userRole?.role_label || "Unknown Role"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {canManage && (
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}