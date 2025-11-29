// mend-2/src/App.tsx

import { Routes, Route } from "react-router-dom";
import "./App.css";

// Auth
import AuthCallback from "./pages/auth/AuthCallback";
import Login from "./pages/auth/Login";
import ClerkLogin from "./pages/auth/ClerkLogin";
import ClerkSignup from "./pages/auth/ClerkSignup";
import ClearSession from "./pages/auth/ClearSession";
import SignUp from "./pages/auth/SignUp";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import DashboardRouter from "./components/auth/DashboardRouter";

// Clerk components
import { UserProfile } from "@clerk/clerk-react";

// Components
import { AppLayout } from "./components/layout/AppLayout";

// Pages
import Administrator from "./pages/roles/Administrator";
import AccountManager from "./pages/AccountManager";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import UserManagementPage from "./pages/UserManagementPage";
import EnhancedUserManagementAdmin from "./pages/EnhancedUserManagementAdmin";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import PublicDashboard from "./pages/PublicDashboard";
import BuilderSeniorDashboard from "./pages/BuilderSeniorDashboard";
import BuilderDashboard from "./pages/BuilderDashboard";
import SiteAdmin from "./pages/roles/SiteAdmin";
import MedicalDashboard from "./pages/MedicalDashboard";
import MedicalHomePage from "./pages/MedicalHomePage";
import MedicalPatientsPage from "./pages/MedicalPatientsPage";
import StorageSetupAdmin from "./pages/StorageSetupAdmin";
import DataAdmin from "./pages/DataAdmin";
import DataConfigurationAdmin from "./pages/DataConfigurationAdmin";
import DataImportAdmin from "./pages/DataImportAdmin";
import ReferenceTablesAdmin from "./pages/ReferenceTablesAdmin";
import SearchVerifyAdmin from "./pages/SearchVerifyAdmin";
import SystemLogsAdmin from "./pages/SystemLogsAdmin";
import MedicalProfessionalsAdmin from "./pages/MedicalProfessionalsAdmin";
import HoursWorkedAdmin from "./pages/HoursWorkedAdmin";
import UserManagementAdmin from "./pages/UserManagementAdmin";
import EmployerManagementAdmin from "./pages/EmployerManagementAdmin";
import SiteManagementAdmin from "./pages/SiteManagementAdmin";
import BuilderSiteManagement from "./pages/BuilderSiteManagement";
import BuilderWorkerManagement from "./pages/BuilderWorkerManagement";
import CompanySettings from "./pages/CompanySettings";
import SuperUserManagement from "./pages/SuperUserManagement";
import AdminUsersPage from "./pages/AdminUsersPage";
import CostConfigurationAdmin from "./pages/CostConfigurationAdmin";
import IncidentReport from "./pages/IncidentReport";
import IncidentReportDev from "./pages/IncidentReportDev";
import IncidentDetailsPage from "./pages/IncidentDetailsPage";
import IncidentEditPage from "./pages/IncidentEditPage";
import LTIDetailsPage from "./pages/LTIDetailsPage";
import InsuranceProviderDashboard from "./pages/InsuranceProviderDashboard";
import GovernmentOfficialDashboard from "./pages/GovernmentOfficialDashboard";
import WorkerPortal from "./pages/WorkerPortal";
import TestRoleQuery from "./pages/TestRoleQuery";
import DebugAuth from "./pages/DebugAuth";
import ClerkDebug from "./pages/ClerkDebug";

function App() {
  return (
    <>
      <Routes>

        {/* Clerk auth pages */}
        <Route path="/sign-in" element={<ClerkLogin />} />
        <Route path="/sign-up" element={<ClerkSignup />} />
        
        {/* Legacy auth pages (keep for backward compatibility) */}
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/clerk-login" element={<ClerkLogin />} />
        <Route path="/auth/clerk-signup" element={<ClerkSignup />} />
        <Route path="/auth/clear-session" element={<ClearSession />} />
        <Route path="/auth/signup" element={<SignUp />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Development routes (unprotected for UX testing) */}
        <Route path="/dev/incident-report" element={<IncidentReportDev />} />
        <Route path="/test-role-query" element={<TestRoleQuery />} />
        <Route path="/debug-auth" element={<DebugAuth />} />
        <Route path="/clerk-debug" element={<ClerkDebug />} />
        <Route path="/public-dashboard" element={<PublicDashboard />} />

        {/* Protected routes wrapped in AppLayout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            {/* Root route - DashboardRouter will fetch role and redirect */}
            <Route path="/" element={<DashboardRouter />} />
            
            {/* Role-specific dashboard routes */}
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="superadmin-dashboard" element={<SuperAdminDashboard />} />
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="account-manager" element={<AccountManager />} />
            <Route path="user-management" element={<EnhancedUserManagementAdmin />} />
            <Route path="builder-senior" element={<BuilderSeniorDashboard />} />
            <Route path="builder" element={<BuilderDashboard />} />
            <Route path="builder/senior/lti-details" element={<LTIDetailsPage />} />
            <Route path="builder/site-management" element={<BuilderSiteManagement />} />
            <Route path="builder/workers" element={<BuilderWorkerManagement />} />
            <Route path="settings" element={<CompanySettings />} />
            <Route path="site-admin" element={<SiteAdmin />} />
            <Route path="medical-dashboard" element={<MedicalDashboard />} />
            <Route path="medical" element={<MedicalHomePage />} />
            <Route path="medical/patients" element={<MedicalPatientsPage />} />
            <Route path="insurance" element={<InsuranceProviderDashboard />} />
            <Route path="government" element={<GovernmentOfficialDashboard />} />
            
            {/* Worker Portal route */}
            <Route path="worker-portal" element={<WorkerPortal />} />

            {/* Administrator route */}
            <Route path="administrator" element={<Administrator />} />
            <Route path="incident-report" element={<IncidentReport />} />
            <Route path="incident/:id" element={<IncidentDetailsPage />} />
            <Route path="incident/:id/edit" element={<IncidentEditPage />} />
            
            {/* User Profile route for Clerk */}
            <Route
              path="user/*"
              element={
                <div className="container mx-auto p-8">
                  <UserProfile
                    appearance={{
                      elements: {
                        rootBox: "w-full max-w-4xl mx-auto",
                        card: "shadow-lg border",
                      },
                    }}
                  />
                </div>
              }
            />

            {/* Admin routes */}
            <Route path="admin/users" element={<AdminUsersPage />} />
            <Route path="admin/storage-setup" element={<StorageSetupAdmin />} />
            <Route path="admin/data" element={<DataAdmin />} />
            <Route path="admin/data-configuration" element={<DataConfigurationAdmin />} />
            <Route path="admin/cost-configuration" element={<CostConfigurationAdmin />} />
            <Route path="admin/data-import" element={<DataImportAdmin />} />
            <Route path="admin/reference-tables" element={<ReferenceTablesAdmin />} />
            <Route path="admin/search-verify" element={<SearchVerifyAdmin />} />
            <Route path="admin/system-logs" element={<SystemLogsAdmin />} />
            <Route path="admin/medical-professionals" element={<MedicalProfessionalsAdmin />} />
            <Route path="admin/hours-worked" element={<HoursWorkedAdmin />} />
            <Route path="admin/users" element={<AdminUsersPage />} />
            <Route path="admin/user-management" element={<UserManagementAdmin />} />
            <Route path="admin/super-user-management" element={<SuperUserManagement />} />
            <Route path="admin/employer-management" element={<EmployerManagementAdmin />} />
            <Route path="admin/site-management" element={<SiteManagementAdmin />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}

export default App;
