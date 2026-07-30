import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { useWorkspace } from "@/lib/workspace";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/pending-renewal")({
  head: () => ({
    meta: [{ title: "Pending Renewal · VNC Global" }],
  }),
  component: PendingRenewalPage,
});

const OVERDUE_DAYS = 90; // "beyond 3 months" — confirmed as overdue, not upcoming

function daysOverdue(renewalDate: string): number {
  return Math.floor((Date.now() - new Date(renewalDate).getTime()) / 86400000);
}

function PendingRenewalPage() {
  const { clients, openClient360 } = useWorkspace();

  // Non-deleted clients whose renewal date is more than 90 days in the
  // past. This is a computed report, not a stored flag — clients are NOT
  // removed from the main Client List by appearing here; they show in
  // both places until the renewal date is updated through whichever
  // path is actually correct for that record (direct edit while
  // Draft/Sent Back, or a Change Request once Approved — see the button
  // below, which opens Client360 rather than editing the date directly
  // here, since bypassing that rule for Approved clients would be a real
  // workflow-integrity problem, not a shortcut worth taking).
  const overdue = clients
    .filter((c) => !c.deletedAt && c.contractRenewalDate && daysOverdue(c.contractRenewalDate) > OVERDUE_DAYS)
    .sort(
      (a, b) =>
        daysOverdue(b.contractRenewalDate!) - daysOverdue(a.contractRenewalDate!),
    );

  return (
    <AppShell>
      <div className="px-8 pt-8 pb-4">
        <div className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
          Masters · Clients
        </div>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight leading-tight">
          Pending Renewal
        </h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground max-w-2xl">
          Clients whose contract renewal date is more than 3 months overdue. These clients still
          appear normally in the main Client List — this is a filtered view to flag them, not a
          separate holding area.
        </p>
        <p className="mt-1 text-[13px] text-muted-foreground max-w-2xl">
          {overdue.length} client{overdue.length === 1 ? "" : "s"} overdue on renewal
        </p>
      </div>

      <div className="px-8 pb-10">
        {overdue.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface/40 px-5 py-14 text-center text-[13px] text-muted-foreground">
            Nothing overdue — every client's renewal date is within the last 3 months, or not set.
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-elevated overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>BU</TableHead>
                  <TableHead>Renewal Date</TableHead>
                  <TableHead>Days Overdue</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdue.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs font-medium">{c.code ?? "—"}</TableCell>
                    <TableCell className="text-sm font-semibold">{c.name}</TableCell>
                    <TableCell className="text-xs">{c.businessUnit ?? "—"}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(c.contractRenewalDate!).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-destructive">
                      {daysOverdue(c.contractRenewalDate!)} days
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => openClient360(c)}>
                        <ExternalLink className="h-3.5 w-3.5" /> Review &amp; Update
                      </Button>
                    </TableCell>
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
