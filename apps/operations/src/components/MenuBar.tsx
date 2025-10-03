// UPDATED: Using new RoleBasedHeader that removes obsolete ModeSelector
import { RoleBasedHeader } from "./navigation/RoleBasedHeader";

export function MenuBar() {
  // Simplified header that handles everything based on user role
  return <RoleBasedHeader />;
}