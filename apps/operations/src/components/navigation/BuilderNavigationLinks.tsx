import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BarChart3, AlertTriangle, Clock } from "lucide-react";

export function BuilderNavigationLinks() {
  return (
    <>
      <Link to="/reports">
        <Button variant="ghost">
          <BarChart3 className="h-4 w-4 mr-2" />
          Reports
        </Button>
      </Link>
      <Link to="/builder/senior/lti-details">
        <Button variant="ghost">
          <AlertTriangle className="h-4 w-4 mr-2" />
          LTI Details
        </Button>
      </Link>
      <Link to="/hours-management">
        <Button variant="ghost">
          <Clock className="h-4 w-4 mr-2" />
          Hours
        </Button>
      </Link>
    </>
  );
}