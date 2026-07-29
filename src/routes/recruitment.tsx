import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { Download, MoreHorizontal, Plus, Search } from "lucide-react";

export const Route = createFileRoute("/recruitment")({
  head: () => ({
    meta: [
      { title: "Recruitment · VNC Global" },
      { name: "description", content: "Hiring pipeline and candidate flow across VNC." },
      { property: "og:title", content: "Recruitment · VNC Global" },
      { property: "og:description", content: "Hiring pipeline and candidate flow." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RecruitmentPage,
});

type Card = { name: string; role: string; days: number; source: string };
const columns: { title: string; tone: string; cards: Card[] }[] = [
  {
    title: "Applied",
    tone: "muted-foreground",
    cards: [
      { name: "Ishaan Kohli", role: "Frontend Engineer", days: 2, source: "LinkedIn" },
      { name: "Sara Fernandes", role: "Product Designer", days: 3, source: "Referral" },
      { name: "Yash Bhatia", role: "Data Engineer", days: 5, source: "Careers" },
    ],
  },
  {
    title: "Screening",
    tone: "teal",
    cards: [
      { name: "Rhea Malhotra", role: "Senior PM", days: 1, source: "Recruiter" },
      { name: "Dev Sinha", role: "SRE", days: 4, source: "LinkedIn" },
    ],
  },
  {
    title: "Interview",
    tone: "purple",
    cards: [
      { name: "Kabir Anand", role: "Design Lead", days: 6, source: "Referral" },
      { name: "Aisha Verma", role: "Analyst", days: 3, source: "Careers" },
      { name: "Rohan Das", role: "Backend Engineer", days: 8, source: "LinkedIn" },
    ],
  },
  {
    title: "Offer",
    tone: "warning",
    cards: [{ name: "Nikhil Mehra", role: "Engineering Manager", days: 2, source: "Recruiter" }],
  },
  {
    title: "Hired",
    tone: "emerald",
    cards: [{ name: "Tanvi Rao", role: "Product Marketing", days: 0, source: "Referral" }],
  },
];

function escapeCsvCell(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadCsv(
  filename: string,
  rows: { name: string; role: string; stage: string; source: string; days: number }[],
) {
  const header = ["Name", "Role", "Stage", "Source", "Days in stage"];
  const lines = rows.map((r) =>
    [r.name, r.role, r.stage, r.source, String(r.days)].map(escapeCsvCell).join(","),
  );
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function RecruitmentPage() {
  const [query, setQuery] = useState("");

  const filteredColumns = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return columns;
    return columns
      .map((col) => ({
        ...col,
        cards: col.cards.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.role.toLowerCase().includes(q) ||
            c.source.toLowerCase().includes(q),
        ),
      }))
      .filter((col) => col.cards.length > 0);
  }, [query]);

  function handleExport() {
    const rows = filteredColumns.flatMap((col) =>
      col.cards.map((c) => ({
        name: c.name,
        role: c.role,
        stage: col.title,
        source: c.source,
        days: c.days,
      })),
    );
    downloadCsv(`vnc-candidates-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  return (
    <AppShell showRightPanel={false}>
      <div className="px-8 pt-8 pb-4">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0">
            <div className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
              Talent
            </div>
            <h1 className="mt-1 text-[28px] font-semibold tracking-tight leading-tight">
              Recruitment
            </h1>
            <p className="mt-1 text-[13.5px] text-muted-foreground max-w-2xl">
              Move candidates through your pipeline. 68 open roles · 412 candidates in flight.
            </p>
          </div>
          <button
            onClick={handleExport}
            className="h-9 px-3 rounded-lg border border-border bg-elevated hover:border-border-strong text-[13px] inline-flex items-center gap-1.5 transition"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </button>
        </div>

        <div className="mt-5 max-w-md h-9 flex items-center gap-2 px-2.5 rounded-lg bg-elevated border border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search candidates, roles, sources…"
            className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="px-8 pb-10 overflow-x-auto">
        {filteredColumns.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface/40 px-5 py-14 text-center text-[13px] text-muted-foreground">
            No candidates match your search.
          </div>
        ) : (
          <div className="flex gap-4 min-w-max">
            {filteredColumns.map((col) => (
              <div key={col.title} className="w-[300px] shrink-0">
                <div className="flex items-center justify-between px-1 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full bg-[color:var(--${col.tone})]`} />
                    <div className="text-[13px] font-semibold">{col.title}</div>
                    <span className="text-[11.5px] text-muted-foreground num">
                      · {col.cards.length}
                    </span>
                  </div>
                  <button className="h-6 w-6 grid place-items-center rounded-md text-muted-foreground hover:bg-surface-2">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="rounded-2xl bg-surface/70 border border-border p-2 space-y-2 min-h-[400px]">
                  {col.cards.map((c) => (
                    <div
                      key={c.name}
                      className="rounded-xl border border-border bg-elevated p-3.5 shadow-sm hover:shadow-md transition group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-[image:var(--gradient-primary)] grid place-items-center text-[10.5px] font-semibold text-white">
                            {c.name
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")}
                          </div>
                          <div>
                            <div className="text-[12.5px] font-semibold leading-tight">
                              {c.name}
                            </div>
                            <div className="text-[11px] text-muted-foreground">{c.role}</div>
                          </div>
                        </div>
                        <button className="opacity-0 group-hover:opacity-100 h-6 w-6 grid place-items-center rounded-md text-muted-foreground hover:bg-surface-2 transition">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-[10.5px]">
                        <span className="px-1.5 py-0.5 rounded-md bg-surface-2 text-muted-foreground border border-border">
                          {c.source}
                        </span>
                        <span className="text-muted-foreground num">
                          {c.days === 0 ? "Today" : `${c.days}d in stage`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
