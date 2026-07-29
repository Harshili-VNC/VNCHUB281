import { Link } from "@tanstack/react-router";
import {
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  ClipboardCheck,
  ListChecks,
  PartyPopper,
  Plus,
} from "lucide-react";
import { useAuth, getDirectReports, getVisiblePeople } from "@/lib/auth";
import {
  useWorkspace,
  tasksDueToday,
  openTasksAssignedByMe,
  pendingLeaveForApprover,
  peopleOnLeaveToday,
} from "@/lib/workspace";

export function RightPanel() {
  const { user, people } = useAuth();
  const { tasks, leaveRequests } = useWorkspace();

  if (!user) return null;

  const isTopLevel = user.departmentFunction === "Leadership" || user.departmentFunction === "Admin";
  const reports = getDirectReports(people, user.id);
  const canAssign = reports.length > 0;

  const dueToday = isTopLevel ? [] : tasksDueToday(tasks, user.id);
  const openAssigned = canAssign ? openTasksAssignedByMe(tasks, user.id) : [];
  const pendingApprovals = canAssign ? pendingLeaveForApprover(leaveRequests, user.id) : [];
  const visibleIds = new Set(getVisiblePeople(people, user).map((p) => p.id));
  const onLeaveToday = peopleOnLeaveToday(leaveRequests, people, visibleIds).filter(
    (p) => p.id !== user.id,
  );

  function personName(id: string) {
    return people.find((p) => p.id === id)?.name ?? "—";
  }

  const hasAnything =
    dueToday.length > 0 ||
    openAssigned.length > 0 ||
    pendingApprovals.length > 0 ||
    onLeaveToday.length > 0;

  return (
    <aside className="hidden xl:flex w-[320px] shrink-0 flex-col border-l border-border bg-surface/60 backdrop-blur-xl">
      <div className="h-16 flex items-center px-5 border-b border-border">
        <div className="text-[13px] font-semibold">Your workspace</div>
        <div className="ml-auto text-[11px] text-muted-foreground">Live</div>
        <span className="ml-2 h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {pendingApprovals.length > 0 && (
          <Section title="Needs your approval" icon={<ClipboardCheck className="h-3.5 w-3.5" />}>
            <ul className="space-y-2">
              {pendingApprovals.slice(0, 4).map((request) => (
                <li
                  key={request.id}
                  className="rounded-xl border border-border bg-elevated p-3 shadow-sm"
                >
                  <div className="text-[12.5px] leading-snug">
                    <span className="font-medium">{personName(request.personId)}</span> is asking
                    for leave
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {request.startDate} → {request.endDate}
                  </div>
                </li>
              ))}
            </ul>
            <Link
              to="/leave"
              className="mt-2 inline-block text-[11.5px] font-medium text-accent hover:text-accent/80"
            >
              Review all →
            </Link>
          </Section>
        )}

        {onLeaveToday.length > 0 && (
          <Section title="On leave today" icon={<PartyPopper className="h-3.5 w-3.5" />}>
            <ul className="space-y-2">
              {onLeaveToday.slice(0, 4).map((person) => (
                <li key={person.id} className="flex items-center gap-2.5">
                  <div className="h-6 w-6 rounded-full bg-[image:var(--gradient-primary)] grid place-items-center text-[10px] font-semibold text-white">
                    {person.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div className="text-[12.5px]">
                    {person.name}{" "}
                    <span className="text-muted-foreground">
                      · {person.designation ?? person.departmentFunction}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {dueToday.length > 0 && (
          <Section title="Your tasks for today" icon={<ListChecks className="h-3.5 w-3.5" />}>
            <ul className="space-y-2">
              {dueToday.slice(0, 4).map((task) => (
                <li
                  key={task.id}
                  className="rounded-xl border border-border bg-elevated p-3 shadow-sm"
                >
                  <div className="text-[12.5px] font-medium leading-snug">{task.title}</div>
                  <div className="text-[11px] text-muted-foreground">Due {task.dueDate}</div>
                </li>
              ))}
            </ul>
            <Link
              to="/tasks"
              className="mt-2 inline-block text-[11.5px] font-medium text-accent hover:text-accent/80"
            >
              Open my tasks →
            </Link>
          </Section>
        )}

        {openAssigned.length > 0 && (
          <Section
            title="Open tasks you've assigned"
            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          >
            <div className="rounded-xl border border-border bg-elevated p-3.5 shadow-sm">
              <div className="text-[20px] font-semibold num">{openAssigned.length}</div>
              <div className="text-[11.5px] text-muted-foreground">
                still in progress across your team
              </div>
            </div>
            <Link
              to="/tasks"
              className="mt-2 inline-block text-[11.5px] font-medium text-accent hover:text-accent/80"
            >
              View all →
            </Link>
          </Section>
        )}

        {!hasAnything && (
          <div className="rounded-xl border border-dashed border-border bg-surface/40 p-5 text-center">
            <CalendarClock className="mx-auto h-5 w-5 text-muted-foreground" />
            <p className="mt-2 text-[12px] text-muted-foreground">You're all caught up.</p>
          </div>
        )}

        <Section title="Quick actions" icon={<Plus className="h-3.5 w-3.5" />}>
          <div className="grid grid-cols-1 gap-2">
            {canAssign && (
              <Link
                to="/tasks"
                className="h-14 rounded-xl border border-border bg-elevated hover:border-border-strong hover:shadow-sm transition text-[12px] font-medium flex items-center gap-2.5 px-3"
              >
                <ListChecks className="h-4 w-4 text-muted-foreground" /> New task
              </Link>
            )}
            {Boolean(user.managerId) && (
              <Link
                to="/leave"
                className="h-14 rounded-xl border border-border bg-elevated hover:border-border-strong hover:shadow-sm transition text-[12px] font-medium flex items-center gap-2.5 px-3"
              >
                <CalendarPlus className="h-4 w-4 text-muted-foreground" /> Request leave
              </Link>
            )}
            {canAssign && (
              <Link
                to="/leave"
                className="h-14 rounded-xl border border-border bg-elevated hover:border-border-strong hover:shadow-sm transition text-[12px] font-medium flex items-center gap-2.5 px-3"
              >
                <ClipboardCheck className="h-4 w-4 text-muted-foreground" /> Review approvals
              </Link>
            )}
          </div>
        </Section>
      </div>
    </aside>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2.5 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {icon}
        {title}
      </div>
      {children}
    </section>
  );
}
