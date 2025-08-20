import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Database } from "lucide-react";

export function MendNavigationLinks() {
  return (
    <>
      <Link to="/account-manager">
        <Button variant="ghost">Account Manager</Button>
      </Link>
      <Link to="/incident-report">
        <Button variant="ghost">Incident Report</Button>
      </Link>
      <Link to="/admin">
        <Button variant="ghost">
          <Database className="h-4 w-4 mr-2" />
          Admin
        </Button>
      </Link>
    </>
  );
}