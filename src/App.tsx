// mend-2/src/App.tsx

import { Routes, Route } from "react-router-dom";
import "./App.css";

// Auth
import AuthStateHandler from "./components/auth/AuthStateHandler"; // still in use
import AuthCallback from "./pages/auth/AuthCallback";
import Login from "./pages/auth/Login";
import ClerkLogin from "./pages/auth/ClerkLogin";
import ClearSession from "./pages/auth/ClearSession";
import SignUp from "./pages/auth/SignUp";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import DashboardRouter from "./components/auth/DashboardRouter";
// import { SessionWarning } from "./components/SessionWarning"; // Disabled for Clerk-only auth

// Pages
// NOTE: Import your Administrator page. Adjust the path if it's in a different folder.
import Administrator from "./pages/roles/Administrator";
import AccountManager from "./pages/AccountManager";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import UserManagementPage from "./pages/UserManagementPage";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import StorageSetupAdmin from "./pages/StorageSetupAdmin";
import DataAdmin from "./pages/DataAdmin";
import DataImportAdmin from "./pages/DataImportAdmin";
import ReferenceTablesAdmin from "./pages/ReferenceTablesAdmin";
import SearchVerifyAdmin from "./pages/SearchVerifyAdmin";
import SystemLogsAdmin from "./pages/SystemLogsAdmin";
import MedicalProfessionalsAdmin from "./pages/MedicalProfessionalsAdmin";
import HoursWorkedAdmin from "./pages/HoursWorkedAdmin";
import UserManagementAdmin from "./pages/UserManagementAdmin";
import IncidentReport from "./pages/IncidentReport";
import IncidentReportDev from "./pages/IncidentReportDev";
import IncidentDetailsPage from "./pages/IncidentDetailsPage";
import IncidentEditPage from "./pages/IncidentEditPage";

function App() {
  return (
    <>
      {/* Session warning disabled for Clerk-only auth */}
      {/* <SessionWarning /> */}
      
      {/* 
        AuthStateHandler will auto-redirect on first load:
          - If user is not logged in → /auth/login
          - If user is logged in → "/"
      */}
      <AuthStateHandler />

      <Routes>

        {/* Auth pages */}
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/clerk-login" element={<ClerkLogin />} />
        <Route path="/auth/clear-session" element={<ClearSession />} />
        <Route path="/auth/signup" element={<SignUp />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Development routes (unprotected for UX testing) */}
        <Route path="/dev/incident-report" element={<IncidentReportDev />} />

        {/* Protected routes go inside a parent route guarded by <ProtectedRoute> */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardRouter />
            </ProtectedRoute>
          }
        >
          {/* Default route - show dashboard at root */}
          <Route index element={<Dashboard />} />
          
          {/* Example routes inside the protected area */}
          <Route path="account-manager" element={<AccountManager />} />
          <Route path="user-management" element={<UserManagementPage />} />

          {/* Administrator route (requires you import Administrator above) */}
          <Route
            path="administrator"
            element={
              <ProtectedRoute allowedRoles={["mend_super_admin", "builder_admin"]}>
                <Administrator />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
             <ProtectedRoute>
               <Dashboard />
             </ProtectedRoute>
             }
          />
          <Route path="incident-report" element={<IncidentReport />} />
          <Route path="incident/:id" element={<IncidentDetailsPage />} />
          <Route path="incident/:id/edit" element={<IncidentEditPage />} />
          
          {/* Admin routes */}
          <Route
            path="admin"
            element={
              <ProtectedRoute allowedRoles={["mend_super_admin", "builder_admin", "administrator"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/storage-setup"
            element={
              <ProtectedRoute allowedRoles={["mend_super_admin"]}>
                <StorageSetupAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/data"
            element={
              <ProtectedRoute allowedRoles={["mend_super_admin", "builder_admin", "administrator"]}>
                <DataAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/data-import"
            element={
              <ProtectedRoute allowedRoles={["mend_super_admin", "builder_admin", "administrator"]}>
                <DataImportAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/reference-tables"
            element={
              <ProtectedRoute allowedRoles={["mend_super_admin", "builder_admin", "administrator"]}>
                <ReferenceTablesAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/search-verify"
            element={
              <ProtectedRoute allowedRoles={["mend_super_admin", "builder_admin"]}>
                <SearchVerifyAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/system-logs"
            element={
              <ProtectedRoute allowedRoles={["mend_super_admin"]}>
                <SystemLogsAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/medical-professionals"
            element={
              <ProtectedRoute allowedRoles={["mend_super_admin", "builder_admin", "administrator"]}>
                <MedicalProfessionalsAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/hours-worked"
            element={
              <ProtectedRoute allowedRoles={["mend_super_admin", "builder_admin"]}>
                <HoursWorkedAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/user-management"
            element={
              <ProtectedRoute allowedRoles={["mend_super_admin", "builder_admin", "administrator"]}>
                <UserManagementAdmin />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </>
  );
}

export default App;