import { Outlet } from "react-router-dom";
import { RoleBasedHeader } from "@/components/navigation/RoleBasedHeader";
import { Toaster } from "@/components/ui/toaster";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* The single, authoritative header */}
      <RoleBasedHeader />
      
      {/* Main content area */}
      <main className="flex-1">
        <Outlet />
      </main>
      
      <Toaster />
    </div>
  );
}

