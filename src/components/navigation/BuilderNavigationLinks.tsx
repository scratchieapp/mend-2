import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function BuilderNavigationLinks() {
  return (
    <>
      <Link to="/builder/senior/lti-details">
        <Button variant="ghost">LTI Details</Button>
      </Link>
    </>
  );
}