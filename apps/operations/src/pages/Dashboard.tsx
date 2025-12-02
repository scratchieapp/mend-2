import { Navigate } from "react-router-dom";

/**
 * Dashboard - Redirects to PublicDashboard
 * 
 * The PublicDashboard is the primary dashboard for all logged-in users.
 * It features:
 * - Recent incidents with quick actions
 * - Site locations map
 * - Quick action buttons (Report Incident, Call Mend)
 * - Weather integration
 * 
 * This redirect ensures consistency across all entry points.
 */
const Dashboard = () => {
  return <Navigate to="/public-dashboard" replace />;
};

export default Dashboard;
