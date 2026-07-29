import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { RightPanel } from "./RightPanel";
import { Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

export function AppShell({
  children,
  showRightPanel = true,
}: {
  children: React.ReactNode;
  showRightPanel?: boolean;
}) {
  const { user, hydrated } = useAuth();

  if (!hydrated) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex min-w-0">
        <div className="flex-1 flex flex-col min-w-0 relative">
          <div className="pointer-events-none absolute inset-0 bg-mesh opacity-10" />
          <div className="relative flex flex-col flex-1 min-w-0">
            <TopBar />
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
        </div>
        {showRightPanel && <RightPanel />}
      </div>
    </div>
  );
}
