import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MendNavigationLinks } from "./MendNavigationLinks";
import { BuilderNavigationLinks } from "./BuilderNavigationLinks";
import { MedicalNavigationLinks } from "./MedicalNavigationLinks";

interface NavigationLinksProps {
  currentMode: "mend" | "builder" | "medical";
}

export function NavigationLinks({ currentMode }: NavigationLinksProps) {
  const homeRoute = {
    mend: "/superadmin-dashboard",
    builder: "/builder",
    medical: "/medical"
  }[currentMode];
  
  return (
    <>
      <Link to={homeRoute}>
        <Button variant="ghost">Home</Button>
      </Link>
      
      {currentMode === "mend" && <MendNavigationLinks />}
      {currentMode === "builder" && <BuilderNavigationLinks />}
      {currentMode === "medical" && <MedicalNavigationLinks />}
    </>
  );
}