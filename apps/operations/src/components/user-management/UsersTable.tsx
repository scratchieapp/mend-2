import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { User } from "@/types/user";
import { UserActionsDropdown } from "./UserActionsDropdown";
import { UseMutationResult } from "@tanstack/react-query";

interface UsersTableProps {
  users: User[] | undefined;
  isLoading: boolean;
  updateUserRoleMutation: UseMutationResult<unknown, Error, { userId: string; role: string; }, unknown>;
  deactivateUserMutation: UseMutationResult<unknown, Error, string, unknown>;
}

export function UsersTable({
  users,
  isLoading,
  updateUserRoleMutation,
  deactivateUserMutation,
}: UsersTableProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users?.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="font-medium">
              {user.user_metadata?.name || 'N/A'}
            </TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              {new Date(user.created_at).toLocaleDateString()}
            </TableCell>
            <TableCell>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Active
              </span>
            </TableCell>
            <TableCell>
              <UserActionsDropdown
                userId={user.id}
                updateUserRoleMutation={updateUserRoleMutation}
                deactivateUserMutation={deactivateUserMutation}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}