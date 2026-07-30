import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { Bot, MessagesSquare, Search, Sparkles, Workflow } from "lucide-react";

export const Route = createFileRoute("/ai-agents")({
  head: () => ({
    meta: [
      { title: "AI Agent Center · VNC Global" },
      { name: "description", content: "The future home of AI agents across VNC — coming soon." },
      { property: "og:title", content: "AI Agent Center · VNC Global" },
      { property: "og:description", content: "AI agents across VNC — coming soon." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AIAgentsPage,
});

const agents = [
  { icon: Search, name: "Insight Agent", desc: "Instantly answer questions across every dataset and document." },
  { icon: Workflow, name: "Workflow Agent", desc: "Automate repetitive processes with natural-language triggers." },
  { icon: MessagesSquare, name: "Client Concierge", desc: "Draft updates, summaries, and QBRs from live client data." },
  { icon: Bot, name: "Talent Copilot", desc: "Screen candidates and schedule interviews without leaving the pipeline." },
];

function AIAgentsPage() {
  return (
    <AppShell showRightPanel={false}>
      <PageHeader
        eyebrow="Coming soon"
        title="AI Agent Center"
        description="A dedicated home for the AI agents that will run alongside every VNC workflow."
        showToolbar={false}
        actions={<div />}
      />

      <div className="px-8 pb-10">
        <div className="rounded-3xl border border-border bg-elevated overflow-hidden shadow-sm">
          <div className="relative p-10 bg-mesh border-b border-border">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-accent text-accent-foreground uppercase tracking-wider">
                <Sparkles className="h-3 w-3" /> Coming soon
              </span>
              <h2 className="mt-4 text-[32px] font-semibold tracking-tight leading-tight">
                Every workflow, <span className="text-gradient">agent-assisted</span>.
              </h2>
              <p className="mt-3 text-[14px] text-muted-foreground">
                We're building a suite of specialized AI agents that live inside VNC Global — helping every team
                move faster without leaving their workspace. Follow updates to be among the first to try them.
              </p>
              <div className="mt-6 flex gap-2">
                <button className="h-10 px-4 rounded-lg text-[13px] font-medium bg-[image:var(--gradient-primary)] text-white shadow-glow hover:opacity-95 transition">
                  Join the waitlist
                </button>
                <button className="h-10 px-4 rounded-lg text-[13px] font-medium border border-border bg-elevated hover:border-border-strong transition">
                  Read the vision
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border">
            {agents.map((a) => (
              <div key={a.name} className="p-6 bg-elevated hover:bg-surface-2/60 transition">
                <div className="h-10 w-10 rounded-xl bg-accent text-accent-foreground grid place-items-center">
                  <a.icon className="h-4 w-4" />
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <div className="text-[15px] font-semibold">{a.name}</div>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-surface-2 border border-border text-muted-foreground uppercase tracking-wider">
                    Soon
                  </span>
                </div>
                <p className="mt-1.5 text-[13px] text-muted-foreground">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
