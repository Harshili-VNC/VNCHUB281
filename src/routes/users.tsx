import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, MoreHorizontal, Plus, ShieldOff, UserCheck, Users2 } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { useAuth, getVisiblePeople, canAddPeople, type PersonStatus } from "@/lib/auth";

export const Route = createFileRoute("/users")({
  head: () => ({
    meta: [
      { title: "User Management · VNC Global" },
      { name: "description", content: "Manage employees, roles, and access across VNC." },
      { property: "og:title", content: "User Management · VNC Global" },
      { property: "og:description", content: "Employees, roles, and access control." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UsersPage,
});

type StatusFilter = "all" | PersonStatus;

function toCsv(
  rows: { name: string; email: string; role: string; department: string; status: string }[],
) {
  const header = ["Name", "Email", "Role", "Department", "Status"];
  const lines = rows.map((r) =>
    [r.name, r.email, r.role, r.department, r.status].map(escapeCsvCell).join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

function escapeCsvCell(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function UsersPage() {
  const { user, people } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const visible = useMemo(
    () => (user ? getVisiblePeople(people, user).filter((p) => p.id !== user.id) : []),
    [people, user],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return visible
      .filter((p) => statusFilter === "all" || p.status === statusFilter)
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          (p.designation ?? p.departmentFunction).toLowerCase().includes(q) ||
          p.department.toLowerCase().includes(q),
      );
  }, [visible, query, statusFilter]);

  if (!user) return null;

  const activeCount = visible.filter((p) => p.status === "active").length;
  const inactiveCount = visible.filter((p) => p.status === "inactive").length;

  const stats = [
    { label: "People in view", value: `${visible.length}`, icon: Users2 },
    { label: "Active", value: `${activeCount}`, icon: UserCheck },
    { label: "Deactivated", value: `${inactiveCount}`, icon: ShieldOff },
  ];

  function handleExport() {
    const csv = toCsv(
      filtered.map((p) => ({
        name: p.name,
        email: p.email,
        role: p.designation ?? p.departmentFunction,
        department: p.department,
        status: p.status,
      })),
    );
    downloadCsv(`vnc-users-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  return (
    <AppShell>
      <div className="px-8 pt-8 pb-4">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0">
            <div className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
              People
            </div>
            <h1 className="mt-1 text-[28px] font-semibold tracking-tight leading-tight">
              User Management
            </h1>
            <p className="mt-1 text-[13.5px] text-muted-foreground max-w-2xl">
              Search, filter, and export the people within your view. Add or edit people from Team
              Management.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="h-9 px-3 rounded-lg border border-border bg-elevated hover:border-border-strong text-[13px] inline-flex items-center gap-1.5 transition"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
            {canAddPeople(user) && (
              <button
                onClick={() => navigate({ to: "/teams" })}
                className="h-9 px-3 rounded-lg text-[13px] font-medium bg-[image:var(--gradient-primary)] text-white shadow-glow inline-flex items-center gap-1.5 hover:opacity-95 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                New
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2 flex-wrap">
          <div className="flex-1 min-w-[260px] max-w-md h-9 flex items-center gap-2 px-2.5 rounded-lg bg-elevated border border-border">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email, role, department…"
              className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-muted-foreground"
            />
          </div>
          {(["all", "active", "inactive"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`h-9 px-3 rounded-lg text-[13px] font-medium capitalize transition ${
                statusFilter === filter
                  ? "bg-surface-2 border border-border-strong"
                  : "text-muted-foreground hover:bg-surface-2 border border-transparent"
              }`}
            >
              {filter === "inactive" ? "Deactivated" : filter}
            </button>
          ))}
        </div>
      </div>

      <div className="px-8 pb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-elevated p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-xl bg-accent grid place-items-center text-accent-foreground">
                <s.icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4 text-[12px] text-muted-foreground">{s.label}</div>
            <div className="mt-0.5 text-[28px] font-semibold num tracking-tight">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="px-8 pb-10">
        <div className="rounded-2xl border border-border bg-elevated overflow-hidden shadow-sm">
          <div className="h-12 px-5 flex items-center justify-between border-b border-border">
            <div className="text-[13px] font-semibold">
              Results <span className="text-muted-foreground font-normal">· {filtered.length}</span>
            </div>
          </div>
          {filtered.length === 0 ? (
            <div className="px-5 py-14 text-center text-[13px] text-muted-foreground">
              No one matches your search.
            </div>
          ) : (
            <table className="w-full text-[13px]">
              <thead className="bg-surface-2/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <Th>User</Th>
                  <Th>Role</Th>
                  <Th>Department</Th>
                  <Th>Status</Th>
                  <Th className="w-10"> </Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => (
                  <tr
                    key={u.id}
                    className={`border-t border-border hover:bg-surface-2/60 transition ${i % 2 === 1 ? "bg-surface/40" : ""}`}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[image:var(--gradient-primary)] grid place-items-center text-[11px] font-semibold text-white">
                          {u.name
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")}
                        </div>
                        <div>
                          <div className="font-medium">{u.name}</div>
                          <div className="text-[11.5px] text-muted-foreground">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">{u.designation ?? u.departmentFunction}</td>
                    <td className="px-5 py-3 text-muted-foreground">{u.department}</td>
                    <td className="px-5 py-3">
                      <StatusPill status={u.status} />
                    </td>
                    <td className="px-5 py-3">
                      <button className="h-7 w-7 grid place-items-center rounded-md text-muted-foreground hover:bg-surface-2">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`text-left font-semibold px-5 py-3 ${className}`}>{children}</th>;
}

function StatusPill({ status }: { status: PersonStatus }) {
  const map: Record<PersonStatus, string> = {
    active: "bg-[color:var(--success)]/12 text-[color:var(--success)]",
    inactive: "bg-surface-2 text-muted-foreground",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${map[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status === "inactive" ? "Deactivated" : status}
    </span>
  );
}
