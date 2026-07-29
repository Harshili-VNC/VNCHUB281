import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { useAuth } from "@/lib/auth";
import { useWorkspace } from "@/lib/workspace";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/employee-history")({
  head: () => ({
    meta: [{ title: "Employee History · VNC Global" }],
  }),
  component: EmployeeHistoryPage,
});

function EmployeeHistoryPage() {
  const { people } = useAuth();
  const { employeeHistory } = useWorkspace();
  const [query, setQuery] = useState("");

  const personName = (id: string) => people.find((p) => p.id === id)?.name ?? "Unknown";
  const personCode = (id: string) => people.find((p) => p.id === id)?.employeeCode ?? "—";

  const rows = useMemo(() => {
    const sorted = [...employeeHistory].sort((a, b) => (a.changedAt < b.changedAt ? 1 : -1));
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((r) => `${personName(r.personId)} ${personCode(r.personId)}`.toLowerCase().includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeHistory, query, people]);

  return (
    <AppShell>
      <div className="px-8 pt-8 pb-4">
        <div className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
          Masters · Employees
        </div>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight leading-tight">
          Employee Change History
        </h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground max-w-2xl">
          Effective-dated employee changes — status, department, designation, salary, and manager.
        </p>
        <div className="mt-5 h-9 flex items-center gap-2 px-2.5 rounded-lg bg-elevated border border-border w-full max-w-xs">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search employee…"
            className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="px-8 pb-10">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface/40 px-5 py-14 text-center text-[13px] text-muted-foreground">
            No effective-dated changes yet. Edits made on the Users / Team pages will show up here
            automatically.
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-elevated overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Field</TableHead>
                  <TableHead>Previous</TableHead>
                  <TableHead>New</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Changed by</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">{r.changedAt}</TableCell>
                    <TableCell>
                      <div className="font-medium">{personName(r.personId)}</div>
                      <div className="text-xs text-muted-foreground">{personCode(r.personId)}</div>
                    </TableCell>
                    <TableCell>{r.field}</TableCell>
                    <TableCell className="max-w-[160px] truncate">{r.previousValue || "—"}</TableCell>
                    <TableCell className="max-w-[160px] truncate">{r.newValue || "—"}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{r.reason || "—"}</TableCell>
                    <TableCell>{r.changedBy}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
