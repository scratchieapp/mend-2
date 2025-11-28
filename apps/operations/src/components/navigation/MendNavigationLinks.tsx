import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Database, Users, FileText } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { isSuperAdmin, isBuilderAdmin, isMendDataEntry } from "@/lib/auth/roles";

export function MendNavigationLinks() {
  const { userData } = useAuth();
  const roleId = userData?.role_id;

  // Determine which nav items to show based on role
  const hasAdminAccess = roleId && (
    isSuperAdmin(roleId) ||
    isBuilderAdmin(roleId) ||
    isMendDataEntry(roleId)
  );

  const canManageUsers = roleId && (
    isSuperAdmin(roleId) ||
    isBuilderAdmin(roleId)
  );

  return (
    <>
      {canManageUsers && (
        <Link to="/admin/user-management">
          <Button variant="ghost">
            <Users className="h-4 w-4 mr-2" />
            Users
          </Button>
        </Link>
      )}
      <Link to="/incident-report?new=true">
        <Button variant="ghost">
          <FileText className="h-4 w-4 mr-2" />
          Incident Report
        </Button>
      </Link>
      {hasAdminAccess && (
        <Link to="/admin">
          <Button variant="ghost">
            <Database className="h-4 w-4 mr-2" />
            Admin
          </Button>
        </Link>
      )}
    </>
  );
}