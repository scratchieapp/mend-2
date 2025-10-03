import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MendNavigationLinks } from "./MendNavigationLinks";
import { BuilderNavigationLinks } from "./BuilderNavigationLinks";
import { MedicalNavigationLinks } from "./MedicalNavigationLinks";
import { useAuth } from "@/lib/auth/AuthContext";

interface NavigationLinksProps {
  currentMode: "mend" | "builder" | "medical";
}

export function NavigationLinks({ currentMode }: NavigationLinksProps) {
  const { userData } = useAuth();
  const roleId = userData?.role_id;

  // Determine home route based on role
  const getHomeRoute = () => {
    if (currentMode === "builder") return "/builder";
    if (currentMode === "medical") return "/medical";

    // For "mend" mode, route based on role_id
    if (roleId === 1) return "/superadmin-dashboard"; // Super Admin
    if (roleId === 5) return "/public-dashboard"; // Builder Admin

    // Default to public dashboard for other roles
    return "/public-dashboard";
  };

  const homeRoute = getHomeRoute();

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