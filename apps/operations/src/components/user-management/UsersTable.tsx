import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Shield, Building2, Mail, User as UserIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { User } from "@/types/user";

interface UsersTableProps {
  users: User[] | undefined;
  isLoading: boolean;
  onEditUser: (user: User) => void;
}

export function UsersTable({
  users,
  isLoading,
  onEditUser,
}: UsersTableProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  const getRoleLabel = (user: User) => {
    // Handle direct role object (from Supabase join)
    if (user.role && typeof user.role === 'object') {
      return user.role.role_label || user.role.role_name || 'Unknown Role';
    }
    return 'No Role Assigned';
  };

  const getRoleBadgeVariant = (roleId: number) => {
    switch (roleId) {
      case 1: return "destructive"; // Super Admin - Red
      case 2: return "default"; // Account Manager
      case 3: return "secondary"; // Data Entry
      case 4: return "secondary"; // Analyst
      case 5: return "outline"; // Builder Admin
      default: return "secondary";
    }
  };

  const getEmployerName = (user: User) => {
    if (user.employer && typeof user.employer === 'object') {
      return user.employer.employer_name;
    }
    return null;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-left">User</TableHead>
            <TableHead className="text-left">Email</TableHead>
            <TableHead className="text-left">Role</TableHead>
            <TableHead className="text-left">Company</TableHead>
            <TableHead className="text-left">Created</TableHead>
            <TableHead className="text-left">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users?.map((user) => (
            <TableRow 
              key={user.user_id} 
              className="hover:bg-muted/50 cursor-pointer"
              onClick={() => onEditUser(user)}
            >
              <TableCell className="font-medium text-left">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <UserIcon className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <div>
                    <div className="font-medium hover:text-primary">
                      {user.display_name || user.user_name || 'No Name'}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-left">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {user.email || 'No Email'}
                </div>
              </TableCell>
              <TableCell className="text-left">
                <Badge 
                  variant={getRoleBadgeVariant(user.role_id)}
                >
                  <Shield className="h-3 w-3 mr-1" />
                  {getRoleLabel(user)}
                </Badge>
              </TableCell>
              <TableCell className="text-left">
                {getEmployerName(user) ? (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{getEmployerName(user)}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Mend Staff</span>
                )}
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
