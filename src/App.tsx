import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/auth/Login";
import PublicUser from "./pages/roles/PublicUser";
import Administrator from "./pages/roles/Administrator";
import Manager from "./pages/roles/Manager";
import Supervisor from "./pages/roles/Supervisor";
import Employee from "./pages/roles/Employee";
import Contractor from "./pages/roles/Contractor";
import Client from "./pages/roles/Client";
import Vendor from "./pages/roles/Vendor";
import Guest from "./pages/roles/Guest";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth/login" element={<Login />} />
          <Route path="/roles/public" element={<PublicUser />} />
          <Route path="/roles/admin" element={<Administrator />} />
          <Route path="/roles/manager" element={<Manager />} />
          <Route path="/roles/supervisor" element={<Supervisor />} />
          <Route path="/roles/employee" element={<Employee />} />
          <Route path="/roles/contractor" element={<Contractor />} />
          <Route path="/roles/client" element={<Client />} />
          <Route path="/roles/vendor" element={<Vendor />} />
          <Route path="/roles/guest" element={<Guest />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;