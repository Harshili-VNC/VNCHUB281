import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { Flame, PlayCircle } from "lucide-react";

export const Route = createFileRoute("/learning")({
  head: () => ({
    meta: [
      { title: "Learning Hub · VNC Global" },
      { name: "description", content: "Courses, learning paths, and skill development across VNC." },
      { property: "og:title", content: "Learning Hub · VNC Global" },
      { property: "og:description", content: "Courses, paths, and skill development." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LearningPage,
});

const courses = [
  { title: "Advanced SQL for Analysts", track: "Data", hours: 6, level: "Intermediate", pct: 78 },
  { title: "AI for Product Managers", track: "Product", hours: 4, level: "Beginner", pct: 42 },
  { title: "System Design Deep Dive", track: "Engineering", hours: 12, level: "Advanced", pct: 16 },
  { title: "Client Storytelling Masterclass", track: "Sales", hours: 3, level: "Intermediate", pct: 0 },
  { title: "Design Systems in Practice", track: "Design", hours: 5, level: "Intermediate", pct: 100 },
  { title: "Financial Fluency for Managers", track: "Leadership", hours: 8, level: "Intermediate", pct: 34 },
];

function LearningPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Growth"
        title="Learning Hub"
        description="Personalized learning paths, certifications, and skill benchmarks — all in one place."
        searchPlaceholder="Search courses, tracks, skills…"
      />

      <div className="px-8 pb-4">
        <div className="rounded-2xl border border-border bg-elevated p-6 shadow-sm relative overflow-hidden">
          <div className="absolute inset-0 bg-mesh" />
          <div className="relative flex items-center justify-between gap-6 flex-wrap">
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                Q3 goal
              </div>
              <div className="mt-1 text-[22px] font-semibold tracking-tight">
                You're <span className="text-gradient">72%</span> to your quarterly learning target.
              </div>
              <div className="mt-1 text-[13px] text-muted-foreground">
                36 of 50 credits earned · <span className="text-[color:var(--warning)] font-medium inline-flex items-center gap-1"><Flame className="h-3 w-3" />18-day streak</span>
              </div>
            </div>
            <div className="h-24 w-24 rounded-full grid place-items-center"
              style={{ background: `conic-gradient(var(--primary) 260deg, var(--surface-2) 0)` }}>
              <div className="h-[86px] w-[86px] rounded-full bg-elevated grid place-items-center text-[20px] font-semibold num">
                72%
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 pb-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {courses.map((c) => (
          <div key={c.title} className="rounded-2xl border border-border bg-elevated overflow-hidden shadow-sm hover:shadow-md transition">
            <div className="h-28 bg-mesh relative border-b border-border">
              <div className="absolute inset-0 bg-[image:var(--gradient-primary)] opacity-10" />
              <div className="absolute bottom-3 left-4 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">
                {c.track} · {c.level}
              </div>
              <button className="absolute bottom-3 right-3 h-9 w-9 rounded-full bg-elevated border border-border grid place-items-center shadow-sm hover:border-border-strong transition">
                <PlayCircle className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5">
              <div className="text-[14px] font-semibold leading-snug">{c.title}</div>
              <div className="mt-1 text-[11.5px] text-muted-foreground">{c.hours} hours · self-paced</div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">
                    {c.pct === 0 ? "Not started" : c.pct === 100 ? "Completed" : "In progress"}
                  </span>
                  <span className="num font-medium">{c.pct}%</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: "var(--gradient-primary)" }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
