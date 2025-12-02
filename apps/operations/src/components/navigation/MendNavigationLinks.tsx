import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Database, Users, FileText, BarChart3, Clock } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { isSuperAdmin, isBuilderAdmin, isMendDataEntry, isSiteAdmin, isMendStaff } from "@/lib/auth/roles";

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

  const canViewReports = roleId && (
    isMendStaff(userData) ||
    isBuilderAdmin(roleId) ||
    isSiteAdmin(userData)
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
      {canViewReports && (
        <Link to="/reports">
          <Button variant="ghost">
            <BarChart3 className="h-4 w-4 mr-2" />
            Reports
          </Button>
        </Link>
      )}
      {isMendStaff(userData) && (
        <Link to="/hours-compliance">
          <Button variant="ghost">
            <Clock className="h-4 w-4 mr-2" />
            Hours
          </Button>
        </Link>
      )}
      <Link to="/incidents">
        <Button variant="ghost">
          <FileText className="h-4 w-4 mr-2" />
          Incidents
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