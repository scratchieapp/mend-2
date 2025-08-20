import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function MedicalNavigationLinks() {
  return (
    <>
      <Link to="/medical/patients">
        <Button variant="ghost">Patients</Button>
      </Link>
    </>
  );
}