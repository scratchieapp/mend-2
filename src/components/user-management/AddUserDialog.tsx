import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UserPlus } from "lucide-react";
import { UseMutationResult } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { UserRoleName } from "@/types/auth";

interface AddUserDialogProps {
  createUserMutation: UseMutationResult<
    unknown,
    Error,
    { email: string; password: string; role: UserRoleName },
    unknown
  >;
  availableRoles: string[];
}

export function AddUserDialog({
  createUserMutation,
  availableRoles,
}: AddUserDialogProps) {
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<UserRoleName | undefined>(
    undefined
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Add User
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a new user account. The user will receive an email to set
            their password.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const email = formData.get("email") as string;
            const password = formData.get("password") as string;

            if (!selectedRole) {
              toast({
                title: "Error",
                description: "Please select a role for the user.",
                variant: "destructive",
              });
              return;
            }

            try {
              await createUserMutation.mutateAsync({
                email,
                password,
                role: selectedRole,
              });
              toast({
                title: "Success",
                description: "User has been created successfully.",
              });
              (e.target as HTMLFormElement).reset();
            } catch (error: any) {
              if (error?.message?.includes("user_already_exists")) {
                toast({
                  title: "Error",
                  description:
                    "This email is already registered. Please use a different email address.",
                  variant: "destructive",
                });
              } else {
                toast({
                  title: "Error",
                  description: "Failed to create user. Please try again.",
                  variant: "destructive",
                });
              }
            }
          }}
        >
          {/* Your existing form content */}
        </form>
      </DialogContent>
    </Dialog>
  );
}