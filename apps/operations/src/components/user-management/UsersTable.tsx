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

  const getRoleLabel = (user: UserData) => {
    if (user.user_roles && Array.isArray(user.user_roles) && user.user_roles[0]) {
      return user.user_roles[0].role_label || 'Unknown Role';
    }
    return 'No Role Assigned';
  };

  const getRoleColor = (user: UserData) => {
    const roleId = user.role_id;
    if (roleId >= 8) return 'bg-purple-100 text-purple-800 border-purple-200';
    if (roleId >= 6) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (roleId >= 4) return 'bg-green-100 text-green-800 border-green-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-left">User</TableHead>
            <TableHead className="text-left">Email</TableHead>
            <TableHead className="text-left">Role</TableHead>
            <TableHead className="text-left">Created</TableHead>
            <TableHead className="text-left">Status</TableHead>
            <TableHead className="w-[100px] text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users?.map((user) => (
            <TableRow key={user.user_id} className="hover:bg-muted/50">
              <TableCell className="font-medium text-left">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <Shield className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">
                      {user.display_name || 'No Name'}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-left text-muted-foreground">
                {user.email || 'No Email'}
              </TableCell>
              <TableCell className="text-left">
                <Badge 
                  variant="secondary" 
                  className={`${getRoleColor(user)} border`}
                >
                  {getRoleLabel(user)}
                </Badge>
              </TableCell>
              <TableCell className="text-left text-muted-foreground">
                {user.created_at ? new Date(user.created_at).toLocaleDateString('en-AU', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                }) : 'Unknown'}
              </TableCell>
              <TableCell className="text-left">
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  Active
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem 
                      onClick={() => onEditUser(user)}
                      className="cursor-pointer"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit User
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
          {!users?.length && (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                No users found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}