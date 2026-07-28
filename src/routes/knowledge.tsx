import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { BookOpen, FileText, Folder, Star } from "lucide-react";

export const Route = createFileRoute("/knowledge")({
  head: () => ({
    meta: [
      { title: "Knowledge Hub · VNC Global" },
      { name: "description", content: "The single source of truth for VNC — playbooks, docs, and wikis." },
      { property: "og:title", content: "Knowledge Hub · VNC Global" },
      { property: "og:description", content: "Playbooks, docs, and wikis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: KnowledgePage,
});

const spaces = [
  { name: "Engineering", docs: 214, tone: "primary" },
  { name: "Product", docs: 128, tone: "purple" },
  { name: "Design", docs: 96, tone: "teal" },
  { name: "People ops", docs: 74, tone: "emerald" },
  { name: "Client playbooks", docs: 152, tone: "warning" },
];

const recents = [
  { title: "Q4 launch runbook", space: "Product", updated: "Today", author: "Meera S." },
  { title: "Interview scorecard: PM", space: "People ops", updated: "Yesterday", author: "Neha K." },
  { title: "Incident postmortem — 2026-07-19", space: "Engineering", updated: "2 days ago", author: "Karthik V." },
  { title: "Acme Corp — QBR notes", space: "Client playbooks", updated: "3 days ago", author: "Aditya R." },
];

function KnowledgePage() {
  const [activeSpace, setActiveSpace] = useState(spaces[0].name);
  const selectedSpace = spaces.find((s) => s.name === activeSpace) ?? spaces[0];

  return (
    <AppShell showRightPanel={false}>
      <PageHeader
        eyebrow="Knowledge"
        title="Knowledge Hub"
        description="A single source of truth — searchable across teams, spaces, and documents."
        searchPlaceholder="Search any document, playbook, or page…"
      />

      <div className="px-8 pb-10 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
        <aside className="space-y-6">
          <div>
            <div className="text-[10.5px] uppercase tracking-wider font-semibold text-muted-foreground px-2 mb-2">Spaces</div>
            <ul className="space-y-0.5">
              {spaces.map((s) => (
                <li key={s.name}>
                  <button
                    onClick={() => setActiveSpace(s.name)}
                    className={[
                      "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition",
                      activeSpace === s.name
                        ? "bg-accent/10 text-foreground border border-accent/20 font-semibold"
                        : "hover:bg-surface-2 text-foreground/85",
                    ].join(" ")}
                  >
                    <Folder className={`h-4 w-4 text-[color:var(--${s.tone})]`} />
                    <span className="flex-1 text-left">{s.name}</span>
                    <span className="text-[11px] text-muted-foreground num">{s.docs}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-[10.5px] uppercase tracking-wider font-semibold text-muted-foreground px-2 mb-2">Pinned</div>
            <ul className="space-y-0.5">
              {["Onboarding checklist", "Company handbook", "Sales playbook"].map((t) => (
                <li key={t}>
                  <button className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] hover:bg-surface-2 text-foreground/85">
                    <Star className="h-3.5 w-3.5 text-[color:var(--warning)]" />
                    <span className="truncate">{t}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-elevated p-6 shadow-sm bg-mesh">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[image:var(--gradient-primary)] grid place-items-center text-white">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[18px] font-semibold tracking-tight">{selectedSpace.name}</div>
                <div className="text-[12px] text-muted-foreground">
                  {selectedSpace.docs} documents · maintained by Karthik V.
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-elevated shadow-sm overflow-hidden">
            <div className="h-12 px-5 flex items-center justify-between border-b border-border">
              <div className="text-[13px] font-semibold">Recently updated</div>
              <div className="text-[12px] text-muted-foreground">Across all spaces</div>
            </div>
            <ul className="divide-y divide-border">
              {recents.map((r) => (
                <li key={r.title} className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-2/60 transition">
                  <div className="h-9 w-9 rounded-lg bg-accent text-accent-foreground grid place-items-center">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-medium truncate">{r.title}</div>
                    <div className="text-[11.5px] text-muted-foreground truncate">
                      {r.space} · {r.author}
                    </div>
                  </div>
                  <div className="text-[11.5px] text-muted-foreground shrink-0">{r.updated}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
