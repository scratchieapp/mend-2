import { Navigate } from "react-router-dom";

/**
 * HoursWorkedAdmin - Redirects to the main Hours Management page
 * 
 * This page was deprecated in favor of /hours-management which has:
 * - Month navigation (view older/newer months)
 * - Status icons showing completion state
 * - Better UX with accordion layout
 * - Proper data loading
 */
const HoursWorkedAdmin = () => {
  return <Navigate to="/hours-management" replace />;
};

export default HoursWorkedAdmin;
