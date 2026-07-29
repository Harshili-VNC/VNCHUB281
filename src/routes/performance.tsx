import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { Trophy, Target, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/performance")({
  head: () => ({
    meta: [
      { title: "Performance · VNC Global" },
      { name: "description", content: "OKRs, KRAs, reviews, and performance analytics across VNC." },
      { property: "og:title", content: "Performance · VNC Global" },
      { property: "og:description", content: "OKRs, KRAs, reviews and analytics." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PerformancePage,
});

const okrs = [
  { title: "Grow enterprise ARR to $18M", owner: "Aditya R.", pct: 74, status: "On track", tone: "success" },
  { title: "Ship analytics v2 to all clients", owner: "Karthik V.", pct: 58, status: "On track", tone: "success" },
  { title: "Improve NPS from 42 → 55", owner: "Neha K.", pct: 41, status: "At risk", tone: "warning" },
  { title: "Reduce time-to-hire by 30%", owner: "People ops", pct: 82, status: "Ahead", tone: "primary" },
];

function PerformancePage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Impact"
        title="Performance Management"
        description="Track KRAs, OKRs, and review cycles with a clear picture of where the organization stands."
        searchPlaceholder="Search objectives, employees, cycles…"
      />

      <div className="px-8 pb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Kpi icon={Target} label="Active objectives" value="142" delta="+18 QoQ" />
        <Kpi icon={Trophy} label="Cycle completion" value="68%" delta="On pace" />
        <Kpi icon={TrendingUp} label="Avg performance score" value="4.2 / 5" delta="+0.3 YoY" />
      </div>

      <div className="px-8 pb-10 grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 rounded-2xl border border-border bg-elevated shadow-sm overflow-hidden">
          <div className="h-12 px-5 flex items-center justify-between border-b border-border">
            <div className="text-[13px] font-semibold">Company OKRs · FY26</div>
            <div className="text-[12px] text-muted-foreground">Updated this morning</div>
          </div>
          <ul className="divide-y divide-border">
            {okrs.map((o) => (
              <li key={o.title} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-medium">{o.title}</div>
                    <div className="text-[11.5px] text-muted-foreground">Owner · {o.owner}</div>
                  </div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full bg-[color:var(--${o.tone})]/12 text-[color:var(--${o.tone})]`}>
                    {o.status}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${o.pct}%`, background: `var(--${o.tone})` }} />
                  </div>
                  <div className="text-[12.5px] num font-medium w-10 text-right">{o.pct}%</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-elevated shadow-sm p-5">
          <div className="text-[13px] font-semibold">Review cycle · Q3 2026</div>
          <div className="text-[11.5px] text-muted-foreground">Closes in 12 days</div>

          <div className="mt-5">
            <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Progress</div>
            <div className="mt-2 h-2.5 rounded-full bg-surface-2 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: "68%", background: "var(--gradient-primary)" }} />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11.5px] text-muted-foreground">
              <span>872 of 1,284 self-reviews</span>
              <span className="num font-medium text-foreground">68%</span>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {[
              { l: "Self-review", v: 92, tone: "primary" },
              { l: "Manager review", v: 58, tone: "purple" },
              { l: "Skip-level", v: 24, tone: "teal" },
              { l: "Calibration", v: 8, tone: "warning" },
            ].map((s) => (
              <div key={s.l}>
                <div className="flex items-center justify-between text-[11.5px]">
                  <span className="text-muted-foreground">{s.l}</span>
                  <span className="num font-medium">{s.v}%</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${s.v}%`, background: `var(--${s.tone})` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Kpi({ icon: Icon, label, value, delta }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; delta: string }) {
  return (
    <div className="rounded-2xl border border-border bg-elevated p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="h-9 w-9 rounded-xl bg-accent grid place-items-center text-accent-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-[11px] text-muted-foreground">{delta}</span>
      </div>
      <div className="mt-4 text-[12px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-[28px] font-semibold num tracking-tight">{value}</div>
    </div>
  );
}
