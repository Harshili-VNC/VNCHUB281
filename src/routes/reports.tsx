import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports Center · VNC Global" },
      { name: "description", content: "Executive reports, dashboards, and business intelligence for VNC." },
      { property: "og:title", content: "Reports Center · VNC Global" },
      { property: "og:description", content: "Executive reports, dashboards, and BI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportsPage,
});

const cards = [
  { title: "Revenue overview", value: "$14.8M", delta: "+22% YoY", data: [30, 42, 40, 55, 58, 62, 70, 72, 78, 82, 88, 92] },
  { title: "Client acquisition", value: "412", delta: "+38 QoQ", data: [20, 26, 24, 30, 32, 36, 40, 44, 48, 52, 56, 60] },
  { title: "Delivery velocity", value: "312 pts", delta: "+9% sprint avg", data: [40, 45, 42, 50, 48, 55, 58, 62, 60, 65, 68, 72] },
  { title: "Pipeline coverage", value: "3.4×", delta: "Healthy", data: [10, 20, 18, 30, 40, 38, 50, 55, 60, 65, 68, 75] },
];

import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

function ReportsPage() {
  const { userPermissions } = useAuth();
  const canViewReports = hasPermission(userPermissions, "reports.view");

  if (!canViewReports) {
    return (
      <AppShell>
        <div className="p-8">
          <div className="rounded-2xl border border-border bg-elevated p-8 text-center">
            <h2 className="text-lg font-semibold">Access Restricted</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              You do not have permission to view the Reports Center. Please contact your System Administrator.
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Analytics"
        title="Reports Center"
        description="Cross-functional reporting with pre-built dashboards for every leader."
        searchPlaceholder="Search reports, saved views, KPIs…"
      />

      <div className="px-8 pb-10 grid grid-cols-1 md:grid-cols-2 gap-5">
        {cards.map((c) => (
          <div key={c.title} className="rounded-2xl border border-border bg-elevated p-6 shadow-sm hover:shadow-md transition">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[12px] text-muted-foreground">{c.title}</div>
                <div className="mt-1 text-[30px] font-semibold num tracking-tight">{c.value}</div>
                <div className="mt-0.5 inline-flex items-center gap-1 text-[12px] text-success font-medium">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  {c.delta}
                </div>
              </div>
              <button className="h-8 px-3 rounded-lg border border-border text-[12px] hover:border-border-strong transition">
                Open
              </button>
            </div>

            <div className="mt-6">
              <Sparkline data={c.data} />
              <div className="mt-2 flex justify-between text-[10.5px] text-muted-foreground">
                {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m) => (
                  <span key={m}>{m}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const w = 600, h = 120, pad = 8;
  const max = Math.max(...data), min = Math.min(...data);
  const points = data.map((v, i) => {
    const x = pad + (i * (w - pad * 2)) / (data.length - 1);
    const y = h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
    return [x, y];
  });
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
  const area = `${path} L${points[points.length - 1][0]},${h - pad} L${points[0][0]},${h - pad} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#g)" />
      <path d={path} fill="none" stroke="var(--primary)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
