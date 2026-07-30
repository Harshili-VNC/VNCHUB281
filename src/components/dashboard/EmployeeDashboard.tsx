import {
  ArrowUpRight,
  CheckCircle2,
  Circle,
  Clock,
  Flame,
  GraduationCap,
  MoreHorizontal,
  Target,
  TrendingUp,
} from "lucide-react";

export function EmployeeDashboard() {
  return (
    <div className="px-8 py-8 space-y-8 max-w-[1600px] mx-auto">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-elevated p-8">
        <div className="absolute inset-0 bg-mesh opacity-70" />
        <div className="relative flex items-start justify-between gap-8 flex-wrap">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Thursday · 23 July 2026
            </div>
            <h1 className="mt-2 text-[38px] font-semibold tracking-tight leading-tight">
              Good morning, <span className="text-gradient">Harshili</span>
            </h1>
            <p className="mt-1.5 text-[14px] text-muted-foreground max-w-xl">
              You have <span className="text-foreground font-medium">6 tasks</span> due today and{" "}
              <span className="text-foreground font-medium">2 meetings</span> before lunch. You're on
              track to close Q3 KRAs this week.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <PillButton primary>Plan my day</PillButton>
              <PillButton>Add task</PillButton>
              <PillButton>Log time</PillButton>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 min-w-[300px]">
            <MiniStat label="Tasks done" value="14/22" trend="+18%" tone="emerald" />
            <MiniStat label="KRA progress" value="72%" trend="+6%" tone="purple" />
            <MiniStat label="Learning" value="3.5h" trend="this week" tone="teal" />
            <MiniStat label="Focus score" value="86" trend="peak" tone="primary" />
          </div>
        </div>
      </section>

      {/* KPI row */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          icon={Target}
          label="KRA completion"
          value="72"
          suffix="%"
          delta="+6.2% MoM"
          bars={[40, 55, 48, 62, 58, 70, 72]}
          tone="purple"
        />
        <KpiCard
          icon={Clock}
          label="Billable hours"
          value="132.5"
          suffix="h"
          delta="+8h vs last wk"
          bars={[20, 28, 24, 32, 30, 36, 33]}
          tone="primary"
        />
        <KpiCard
          icon={GraduationCap}
          label="Learning streak"
          value="18"
          suffix="d"
          delta="Personal best"
          bars={[10, 20, 30, 40, 50, 60, 100]}
          tone="teal"
        />
        <KpiCard
          icon={TrendingUp}
          label="Performance"
          value="A"
          suffix=""
          delta="Top 5% in unit"
          bars={[60, 70, 65, 78, 82, 88, 92]}
          tone="emerald"
        />
      </section>

      {/* Main grid */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <TasksCard />
        <LearningCard />
        <MeetingsCard />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <TeamUpdatesCard />
        <AnnouncementsCard />
        <CalendarCard />
      </section>
    </div>
  );
}

/* ---------- Building blocks ---------- */

function PillButton({ children, primary }: { children: React.ReactNode; primary?: boolean }) {
  return (
    <button
      className={
        primary
          ? "h-9 px-4 rounded-full text-[13px] font-medium bg-[image:var(--gradient-primary)] text-white shadow-glow hover:opacity-95 transition"
          : "h-9 px-4 rounded-full text-[13px] font-medium bg-elevated border border-border hover:border-border-strong transition"
      }
    >
      {children}
    </button>
  );
}

const toneMap: Record<string, string> = {
  purple: "text-[color:var(--purple)] bg-[color:var(--purple)]/12",
  teal: "text-[color:var(--teal)] bg-[color:var(--teal)]/12",
  emerald: "text-[color:var(--emerald)] bg-[color:var(--emerald)]/12",
  primary: "text-[color:var(--primary)] bg-[color:var(--primary)]/14",
};

function MiniStat({
  label,
  value,
  trend,
  tone,
}: {
  label: string;
  value: string;
  trend: string;
  tone: keyof typeof toneMap | string;
}) {
  return (
    <div className="surface-glass rounded-2xl p-3.5">
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </div>
      <div className="mt-1 text-[22px] font-semibold num">{value}</div>
      <div className={`mt-0.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10.5px] font-medium ${toneMap[tone] ?? toneMap.primary}`}>
        {trend}
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  suffix,
  delta,
  bars,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  suffix: string;
  delta: string;
  bars: number[];
  tone: string;
}) {
  const t = toneMap[tone] ?? toneMap.primary;
  return (
    <div className="rounded-2xl border border-border bg-elevated p-5 hover:shadow-md transition group relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div className={`h-9 w-9 rounded-xl grid place-items-center ${t}`}>
          <Icon className="h-4 w-4" />
        </div>
        <button className="h-7 w-7 grid place-items-center rounded-md text-muted-foreground hover:bg-surface-2 opacity-0 group-hover:opacity-100 transition">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4 text-[12px] text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-[34px] font-semibold num tracking-tight">{value}</span>
        <span className="text-[16px] text-muted-foreground num">{suffix}</span>
      </div>
      <div className="mt-1 inline-flex items-center gap-1 text-[11.5px] font-medium text-success">
        <ArrowUpRight className="h-3 w-3" />
        {delta}
      </div>
      <div className="mt-4 flex items-end gap-1 h-10">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm bg-[image:var(--gradient-primary)] opacity-80"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function Card({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-border bg-elevated overflow-hidden ${className}`}>
      <div className="h-12 px-5 flex items-center justify-between border-b border-border">
        <div className="text-[13px] font-semibold">{title}</div>
        <div className="text-[12px] text-muted-foreground">{action}</div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function TasksCard() {
  const tasks = [
    { t: "Finalize Q4 roadmap doc", tag: "Product", pri: "High", done: true },
    { t: "Review Acme SOW draft", tag: "Legal", pri: "High", done: false },
    { t: "1:1 with Ravi", tag: "People", pri: "Med", done: false },
    { t: "Ship analytics v2", tag: "Engineering", pri: "High", done: false },
    { t: "Reply to design review", tag: "Design", pri: "Low", done: false },
  ];
  return (
    <Card title="Today's tasks" action={<span>{tasks.filter((x) => !x.done).length} open</span>}>
      <ul className="divide-y divide-border -my-2">
        {tasks.map((t) => (
          <li key={t.t} className="flex items-center gap-3 py-2.5">
            {t.done ? (
              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <span className={`flex-1 text-[13px] ${t.done ? "line-through text-muted-foreground" : ""}`}>
              {t.t}
            </span>
            <span className="text-[10.5px] px-1.5 py-0.5 rounded-md bg-surface-2 text-muted-foreground border border-border">
              {t.tag}
            </span>
            <span
              className={`text-[10.5px] font-semibold ${
                t.pri === "High"
                  ? "text-danger"
                  : t.pri === "Med"
                  ? "text-warning"
                  : "text-muted-foreground"
              }`}
            >
              {t.pri}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function LearningCard() {
  const courses = [
    { name: "Advanced SQL for Analysts", pct: 78, tone: "primary" },
    { name: "AI for Product Managers", pct: 42, tone: "purple" },
    { name: "System Design Deep Dive", pct: 16, tone: "teal" },
  ];
  return (
    <Card title="Learning journey" action={<span>3 in progress</span>}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative h-16 w-16 rounded-full grid place-items-center"
               style={{ background: `conic-gradient(var(--primary) 254deg, var(--surface-2) 0)` }}>
            <div className="absolute inset-1.5 rounded-full bg-elevated grid place-items-center">
              <div className="text-[14px] font-semibold num">72%</div>
            </div>
          </div>
          <div>
            <div className="text-[13px] font-medium">Q3 learning goal</div>
            <div className="text-[11.5px] text-muted-foreground">36 of 50 credits earned</div>
            <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-warning font-medium">
              <Flame className="h-3 w-3" /> 18-day streak
            </div>
          </div>
        </div>
        <div className="space-y-3">
          {courses.map((c) => (
            <div key={c.name}>
              <div className="flex items-center justify-between text-[12.5px]">
                <span className="truncate pr-2">{c.name}</span>
                <span className="num text-muted-foreground">{c.pct}%</span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${toneMap[c.tone].split(" ")[1].replace("/12", "")}`}
                  style={{ width: `${c.pct}%`, background: "var(--gradient-primary)" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function MeetingsCard() {
  const meetings = [
    { time: "10:30", title: "Weekly product sync", who: "6 attendees", color: "var(--primary)" },
    { time: "12:00", title: "1:1 with Ravi", who: "Ravi Iyer", color: "var(--teal)" },
    { time: "15:30", title: "Client review · Acme", who: "External", color: "var(--purple)" },
    { time: "17:00", title: "Design critique", who: "Design guild", color: "var(--emerald)" },
  ];
  return (
    <Card title="Upcoming meetings" action={<span>4 today</span>}>
      <ul className="space-y-3">
        {meetings.map((m) => (
          <li key={m.title} className="flex items-center gap-3">
            <div className="w-14 shrink-0">
              <div className="text-[13px] font-semibold num">{m.time}</div>
              <div className="text-[10.5px] text-muted-foreground">45 min</div>
            </div>
            <div className="flex-1 rounded-xl border border-border bg-surface-2/60 px-3 py-2.5 relative">
              <span
                className="absolute left-0 top-2 bottom-2 w-1 rounded-r"
                style={{ background: m.color }}
              />
              <div className="text-[13px] font-medium">{m.title}</div>
              <div className="text-[11px] text-muted-foreground">{m.who}</div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function TeamUpdatesCard() {
  const items = [
    { who: "Meera S.", role: "Design Lead", text: "Shipped new onboarding flow for Enterprise tier." },
    { who: "Karthik V.", role: "Eng Manager", text: "Rolled out CI pipeline v3 across all repos." },
    { who: "Ananya P.", role: "Analyst", text: "Published Q3 client health scorecard." },
  ];
  return (
    <Card title="Team updates" className="xl:col-span-2" action={<span>Last 24h</span>}>
      <ul className="grid md:grid-cols-2 gap-3">
        {items.map((i) => (
          <li key={i.who} className="rounded-xl border border-border p-3.5 flex gap-3">
            <div className="h-8 w-8 rounded-full bg-[image:var(--gradient-primary)] grid place-items-center text-[11px] font-semibold text-white">
              {i.who.split(" ")[0][0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px]">
                <span className="font-semibold">{i.who}</span>{" "}
                <span className="text-muted-foreground">· {i.role}</span>
              </div>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground">{i.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function AnnouncementsCard() {
  return (
    <Card title="Announcements">
      <div className="space-y-3">
        <div className="rounded-xl border border-border p-3.5 bg-[image:var(--gradient-mesh)]">
          <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">
            All hands
          </div>
          <div className="mt-1 text-[13px] font-medium">FY26 strategy town-hall</div>
          <div className="text-[11.5px] text-muted-foreground">Fri, 25 July · 4:00 PM IST</div>
        </div>
        <div className="rounded-xl border border-border p-3.5">
          <div className="text-[10.5px] uppercase tracking-wider text-[color:var(--teal)] font-semibold">
            Policy
          </div>
          <div className="mt-1 text-[13px] font-medium">Updated remote-work guidelines</div>
          <div className="text-[11.5px] text-muted-foreground">Effective 1 August 2026</div>
        </div>
      </div>
    </Card>
  );
}

function CalendarCard() {
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  const events: Record<number, string> = { 3: "primary", 8: "teal", 14: "emerald", 18: "purple", 23: "primary", 27: "warning" };
  return (
    <Card title="July 2026" action={<span>Focus week</span>}>
      <div className="grid grid-cols-7 gap-1 text-center">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div key={i} className="text-[10px] text-muted-foreground font-semibold uppercase">
            {d}
          </div>
        ))}
        {days.map((d) => {
          const today = d === 23;
          const evt = events[d];
          return (
            <div
              key={d}
              className={[
                "aspect-square rounded-lg text-[11.5px] grid place-items-center relative num transition",
                today
                  ? "bg-[image:var(--gradient-primary)] text-white font-semibold shadow-glow"
                  : "hover:bg-surface-2 text-foreground/85",
              ].join(" ")}
            >
              {d}
              {evt && !today && (
                <span
                  className="absolute bottom-1 h-1 w-1 rounded-full"
                  style={{ background: `var(--${evt})` }}
                />
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
