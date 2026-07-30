import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  ChevronRight,
  CircleUserRound,
  Crown,
  Megaphone,
  ShieldCheck,
  Sparkles,
  UserCog,
  UsersRound,
  Wallet,
} from "lucide-react";
import {
  useAuth,
  getDirectReports,
  getManagerChain,
  getVisiblePeople,
  canAddPeople,
  type Person,
} from "@/lib/auth";
import { OrgChart } from "@/components/shared/OrgTree";

type Meta = { eyebrow: string; title: string; description: string; icon: typeof Crown; accent: string };

const departmentFunctionMeta: Record<string, Meta> = {
  Leadership: {
    eyebrow: "Executive command center",
    title: "See the whole company clearly",
    description:
      "Track business momentum, leadership accountability, and the priorities shaping every team.",
    icon: Crown,
    accent: "var(--purple)",
  },
  Admin: {
    eyebrow: "Executive command center",
    title: "Keep the company running smoothly",
    description: "Full visibility and administrative control across every department.",
    icon: UserCog,
    accent: "var(--purple)",
  },
  Finance: {
    eyebrow: "Finance command center",
    title: "Keep the numbers on track",
    description: "Client billing, contracts, and financial records for the business.",
    icon: Wallet,
    accent: "var(--primary)",
  },
  HR: {
    eyebrow: "People command center",
    title: "Support the people who make VNC work",
    description: "Employee records, onboarding, and the people-side of the business.",
    icon: UsersRound,
    accent: "var(--emerald)",
  },
  Marketing: {
    eyebrow: "Marketing command center",
    title: "Tell the VNC story",
    description: "Brand, campaigns, and outward-facing communication.",
    icon: Megaphone,
    accent: "var(--teal)",
  },
  Operations: {
    eyebrow: "Operations command center",
    title: "Turn strategy into team momentum",
    description:
      "Align delivery, unblock your team, and keep work moving against shared goals.",
    icon: BriefcaseBusiness,
    accent: "var(--primary)",
  },
  "IT / Systems": {
    eyebrow: "Systems command center",
    title: "Keep everything running",
    description: "Tools, access, and the systems the rest of the company depends on.",
    icon: Sparkles,
    accent: "var(--primary)",
  },
};

const businessUnitHeadMeta: Meta = {
  eyebrow: "Business unit command center",
  title: "Own delivery for your business unit",
  description: "Review and approve client records, and keep delivery teams aligned.",
  icon: Building2,
  accent: "var(--primary)",
};

const teamLeadMeta: Meta = {
  eyebrow: "Team command center",
  title: "Lead the work in front of you",
  description: "Keep your team focused, supported, and clear on the next commitment that matters.",
  icon: ShieldCheck,
  accent: "var(--teal)",
};

const defaultMeta: Meta = {
  eyebrow: "My workspace",
  title: "Make meaningful progress today",
  description: "See your work, learning goals, and connection to the team priorities above you.",
  icon: CircleUserRound,
  accent: "var(--emerald)",
};

/** Priority: Leadership/Admin/department function first, then BU Head, then Team Lead, then default. */
function metaFor(person: Person): Meta {
  if (person.departmentFunction === "Leadership" || person.departmentFunction === "Admin") {
    return departmentFunctionMeta[person.departmentFunction];
  }
  if (person.isBusinessUnitHead) return businessUnitHeadMeta;
  if (departmentFunctionMeta[person.departmentFunction]) {
    return departmentFunctionMeta[person.departmentFunction];
  }
  if (person.isTeamLead) return teamLeadMeta;
  return defaultMeta;
}

export function HierarchyDashboard() {
  const { user, people } = useAuth();
  if (!user) return null;

  const meta = metaFor(user);
  const MetaIcon = meta.icon;

  const managerChainNearestFirst = getManagerChain(people, user.id);
  const managerChainTopDown = [...managerChainNearestFirst].reverse();
  const immediateManager = managerChainNearestFirst[0] ?? null;
  const directReports = getDirectReports(people, user.id);
  const visiblePeople = getVisiblePeople(people, user);
  const timeline = [...managerChainTopDown, user];
  const showReportingLine = user.departmentFunction !== "Leadership" && user.departmentFunction !== "Admin";

  return (
    <div className="mx-auto max-w-[1600px] space-y-7 px-8 py-8">
      <section className="relative overflow-hidden rounded-3xl border border-border bg-elevated p-8">
        <div className="absolute inset-0 bg-mesh opacity-70" />
        <div className="relative flex flex-wrap items-start justify-between gap-8">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <MetaIcon className="h-3.5 w-3.5" style={{ color: meta.accent }} />
              {meta.eyebrow}
            </div>
            <h1 className="mt-3 text-[38px] font-semibold leading-tight tracking-tight">
              {meta.title}, <span className="text-gradient">{user.name.split(" ")[0]}</span>
            </h1>
            <p className="mt-2 max-w-xl text-[14px] leading-6 text-muted-foreground">
              {meta.description}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                to="/teams"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[image:var(--gradient-primary)] px-4 text-[13px] font-medium text-white shadow-glow transition hover:opacity-95"
              >
                {canAddPeople(user) ? "Manage your team" : "Open team view"}{" "}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                to="/performance"
                className="inline-flex h-9 items-center rounded-lg border border-border bg-elevated px-4 text-[13px] font-medium transition hover:border-border-strong"
              >
                Review performance
              </Link>
            </div>
          </div>
          <div className="grid min-w-[280px] grid-cols-2 gap-3">
            <MetricCard label="Designation" value={user.designation ?? user.departmentFunction} />
            <MetricCard label="Department" value={user.department} />
            <MetricCard label="Visible people" value={`${visiblePeople.length}`} />
            <MetricCard label="Direct reports" value={`${directReports.length}`} />
          </div>
        </div>
      </section>

      <section
        className={`grid grid-cols-1 gap-5 ${
          showReportingLine ? "xl:grid-cols-[1.4fr_0.6fr]" : "xl:grid-cols-1"
        }`}
      >
        {showReportingLine && (
          <div className="rounded-2xl border border-border bg-elevated p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[13px] font-semibold">Your reporting line</div>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  From the top of the org down to you.
                </p>
              </div>
              <UsersRound className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="mt-6 space-y-3">
              {timeline.map((node, index) => {
                const isCurrent = node.id === user.id;
                const reports = getDirectReports(people, node.id);
                return (
                  <div key={node.id} className="flex items-center gap-3">
                    <div
                      className={`relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white ${isCurrent ? "bg-[image:var(--gradient-primary)] ring-4 ring-accent/10" : "bg-surface-2 text-foreground border border-border"}`}
                    >
                      {node.name
                        .split(" ")
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                    <div
                      className={`flex min-w-0 flex-1 items-center justify-between gap-4 rounded-xl border p-3 ${isCurrent ? "border-accent/30 bg-accent/5" : "border-border bg-surface/50"}`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-[13px] font-semibold">{node.name}</span>
                          {isCurrent && (
                            <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                              You
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {node.designation ?? node.departmentFunction} · {node.department}
                        </div>
                      </div>
                      <div className="hidden text-right sm:block">
                        <div className="text-[11px] font-medium">
                          {reports.length} direct report{reports.length === 1 ? "" : "s"}
                        </div>
                        <div className="mt-0.5 max-w-[220px] text-[10px] text-muted-foreground">
                          {metaFor(node).description}
                        </div>
                      </div>
                    </div>
                    {index < timeline.length - 1 && (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-elevated p-6">
            <div className="text-[13px] font-semibold">Your connection map</div>
            <div className="mt-5 space-y-4">
              <Connection
                label="Reports to"
                person={immediateManager?.name ?? "Top of the org"}
                role={immediateManager?.designation ?? immediateManager?.departmentFunction ?? "No manager above you"}
              />
              <Connection
                label="Owns"
                person={
                  directReports.length
                    ? `${directReports.length} direct report${directReports.length === 1 ? "" : "s"}`
                    : "Your assigned work"
                }
                role={directReports.length ? "Team health and delivery" : "Personal outcomes"}
              />
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-[image:var(--gradient-primary)] p-6 text-white">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60">
              Access scope
            </div>
            <div className="mt-2 text-xl font-semibold">{user.designation ?? user.departmentFunction} permissions</div>
            <p className="mt-2 text-[12px] leading-5 text-white/70">
              Your workspace is tailored to the decisions and people within your reporting line.
            </p>
            <Link
              to="/settings"
              className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-medium text-white hover:text-white/80"
            >
              Manage settings <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {canAddPeople(user) && (
          <div className="rounded-2xl border border-border bg-elevated overflow-hidden xl:col-span-2">
            <div className="flex items-start justify-between gap-4 p-6 pb-0">
              <div>
                <div className="text-[13px] font-semibold">Who's under you</div>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  Your team's reporting structure, nested by manager.
                </p>
              </div>
              <Link
                to="/teams"
                className="text-[11.5px] font-medium text-accent hover:text-accent/80 shrink-0"
              >
                Full org chart →
              </Link>
            </div>
            <OrgChart people={people} rootIds={visiblePeople.map((p) => p.id)} />
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-glass rounded-xl p-3.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1.5 truncate text-[16px] font-semibold">{value}</div>
    </div>
  );
}

function Connection({ label, person, role }: { label: string; person: string; role: string }) {
  return (
    <div className="border-l-2 border-accent/30 pl-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-[13px] font-medium">{person}</div>
      <div className="text-[11px] text-muted-foreground">{role}</div>
    </div>
  );
}
