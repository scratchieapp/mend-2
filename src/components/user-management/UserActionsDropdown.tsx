import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import { UseMutationResult } from "@tanstack/react-query";

interface UserActionsDropdownProps {
  userId: string;
  updateUserRoleMutation: UseMutationResult<any, Error, { userId: string; role: string; }, unknown>;
  deactivateUserMutation: UseMutationResult<any, Error, string, unknown>;
}

export function UserActionsDropdown({
  userId,
  updateUserRoleMutation,
  deactivateUserMutation,
}: UserActionsDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            updateUserRoleMutation.mutate({
              userId,
              role: 'admin'
            });
          }}
        >
          Make Admin
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-red-600"
          onClick={() => {
            if (window.confirm('Are you sure you want to deactivate this user?')) {
              deactivateUserMutation.mutate(userId);
            }
          }}
        >
          Deactivate
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}