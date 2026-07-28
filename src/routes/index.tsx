import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/AppShell";
import { HierarchyDashboard } from "@/components/dashboard/HierarchyDashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VNC Global · Enterprise workspace" },
      {
        name: "description",
        content:
          "VNC Global is the enterprise operating system for VNC — dashboards, teams, clients, learning, and knowledge in one premium workspace.",
      },
      { property: "og:title", content: "VNC Global · Enterprise workspace" },
      {
        property: "og:description",
        content:
          "Premium enterprise workspace for VNC — dashboards, teams, clients, learning, and knowledge.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <AppShell>
      <HierarchyDashboard />
    </AppShell>
  );
}
