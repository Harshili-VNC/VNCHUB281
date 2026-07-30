import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/AppShell";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useWorkspace } from "@/lib/workspace";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/import-history")({
  head: () => ({
    meta: [{ title: "Import History · VNC Global" }],
  }),
  component: ImportHistoryPage,
});

import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

function ImportHistoryPage() {
  const { userPermissions } = useAuth();
  const { importJobs } = useWorkspace();
  const sorted = [...importJobs].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  if (userPermissions && Object.keys(userPermissions).length > 0 && !hasPermission(userPermissions, "client.view") && !hasPermission(userPermissions, "system.import_data")) {
    return (
      <AppShell>
        <div className="p-12 text-center">
          <h2 className="text-xl font-bold text-destructive">403 — Access Denied</h2>
          <p className="text-sm text-muted-foreground mt-2">You do not have permission to view Import History.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="px-8 pt-8 pb-4">
        <div className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
          Masters · Imports
        </div>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight leading-tight">
          Import Job History
        </h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground max-w-2xl">
          Every bulk import run, with row-level success/failure counts.
        </p>
      </div>

      <div className="px-8 pb-10">
        {sorted.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface/40 px-5 py-14 text-center text-[13px] text-muted-foreground">
            No imports have been run yet.
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-elevated overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Success</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell className="whitespace-nowrap">{j.createdAt}</TableCell>
                    <TableCell>{j.module}</TableCell>
                    <TableCell>{j.fileName}</TableCell>
                    <TableCell className="text-right">{j.totalRows}</TableCell>
                    <TableCell className="text-right text-emerald-700 font-semibold">
                      {j.successRows}
                    </TableCell>
                    <TableCell className="text-right text-red-600 font-semibold">
                      {j.failedRows}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={j.status} />
                    </TableCell>
                    <TableCell>{j.createdBy}</TableCell>
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
