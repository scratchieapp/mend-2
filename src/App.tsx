import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/auth/Login";
import ConfirmationPending from "./pages/auth/ConfirmationPending";
import MendSuperAdmin from "./pages/roles/MendSuperAdmin";
import MendAccountManager from "./pages/roles/MendAccountManager";
import MendDataEntry from "./pages/roles/MendDataEntry";
import MendAnalyst from "./pages/roles/MendAnalyst";
import BuilderAdmin from "./pages/roles/BuilderAdmin";
import SiteAdmin from "./pages/roles/SiteAdmin";
import PublicUser from "./pages/roles/PublicUser";
import { AuthCallback } from "./components/auth/AuthCallback";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Add a catch-all route at the root that redirects to home */}
          <Route path="/" element={<Index />} />
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/callback" element={
            <AuthCallback onProfileFetch={async (userId) => {
              // For now, just return true to indicate success
              // Later we can fetch user profile data here
              return true;
            }} />
          } />
          <Route path="/auth/confirmation-pending" element={<ConfirmationPending />} />
          <Route path="/roles/mend-super-admin" element={<MendSuperAdmin />} />
          <Route path="/roles/mend-account-manager" element={<MendAccountManager />} />
          <Route path="/roles/mend-data-entry" element={<MendDataEntry />} />
          <Route path="/roles/mend-analyst" element={<MendAnalyst />} />
          <Route path="/roles/builder-admin" element={<BuilderAdmin />} />
          <Route path="/roles/site-admin" element={<SiteAdmin />} />
          <Route path="/roles/public" element={<PublicUser />} />
          {/* Add a catch-all route that redirects to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;