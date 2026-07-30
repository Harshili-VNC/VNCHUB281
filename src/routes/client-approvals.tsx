import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Check, RotateCcw, X } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { useWorkspace, clientsPendingApproval } from "@/lib/workspace";
import type { ClientRecord } from "@/lib/workspace";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/client-approvals")({
  head: () => ({
    meta: [{ title: "Client Approvals · VNC Global" }],
  }),
  component: ClientApprovalsPage,
});

type Decision = "Approved" | "Rejected" | "Sent Back for Correction";

import {
  canApproveClient,
  canRejectClient,
  canSendBackClient,
} from "@/lib/client-visibility";

function ClientApprovalsPage() {
  const { user, userPermissions } = useAuth();
  const { clients, decideClientApproval, openClient360 } = useWorkspace();
  const [action, setAction] = useState<{ client: ClientRecord; decision: Decision } | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const canApprove = canApproveClient(user, null, userPermissions);
  const noteRequired = action?.decision !== "Approved";
  const noteMissing = noteRequired && !note.trim();

  const pending = clientsPendingApproval(clients);
  const approvedCount = clients.filter((c) => c.recordStatus === "Approved").length;
  const rejectedCount = clients.filter((c) => c.recordStatus === "Rejected").length;
  const sentBackCount = clients.filter((c) => c.recordStatus === "Sent Back for Correction").length;

  async function confirm() {
    if (!action) return;
    if (noteMissing) {
      toast.error("A note is required when rejecting or sending back for correction.");
      return;
    }
    setBusy(true);
    try {
      const result = await decideClientApproval(action.client.id, action.decision, note);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Client ${action.decision.toLowerCase()}`);
      setAction(null);
      setNote("");
    } catch (err) {
      // The workspace action already normalizes thrown errors, so this is a
      // last-resort net. Either way the finally block below guarantees the
      // dialog can never stay stuck on "Saving…".
      console.error("Approval decision failed:", err);
      toast.error("Could not record the decision. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (userPermissions && Object.keys(userPermissions).length > 0 && !hasPermission(userPermissions, "client.view")) {
    return (
      <AppShell>
        <div className="p-12 text-center">
          <h2 className="text-xl font-bold text-destructive">403 — Access Denied</h2>
          <p className="text-sm text-muted-foreground mt-2">You do not have permission to view Client Approvals.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="px-8 pt-8 pb-4">
        <div className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
          Masters · Clients
        </div>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight leading-tight">
          Client Approval Queue
        </h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground max-w-2xl">
          Review submitted client records — approve, send back for correction, or reject.
          {!canApprove && " You have view-only access; only the BU Head can action these."}
        </p>

        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Pending review" value={pending.length} />
          <MetricCard label="Sent back" value={sentBackCount} />
          <MetricCard label="Approved" value={approvedCount} />
          <MetricCard label="Rejected" value={rejectedCount} />
        </div>
      </div>

      <div className="px-8 pb-10">
        {pending.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface/40 px-5 py-14 text-center text-[13px] text-muted-foreground">
            Nothing to review — all client submissions have been processed.
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-elevated overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>BU</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Contract</TableHead>
                  <TableHead>Record</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.code ?? "—"}</TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => openClient360(c)}
                        className="font-semibold text-foreground hover:text-accent hover:underline text-left cursor-pointer"
                      >
                        {c.name}
                      </button>
                    </TableCell>
                    <TableCell>{c.businessUnit ?? "—"}</TableCell>
                    <TableCell>{c.billingEntity ?? "—"}</TableCell>
                    <TableCell>{c.contractType ?? "—"}</TableCell>
                    <TableCell>
                      <StatusBadge status={c.recordStatus} />
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap space-x-1">
                      {canApproveClient(user, c, userPermissions) ||
                      canSendBackClient(user, c, userPermissions) ||
                      canRejectClient(user, c, userPermissions) ? (
                        <>
                          {canApproveClient(user, c, userPermissions) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-emerald-700"
                              onClick={() => setAction({ client: c, decision: "Approved" })}
                            >
                              <Check className="h-3.5 w-3.5" /> Approve
                            </Button>
                          )}
                          {canSendBackClient(user, c, userPermissions) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-amber-700"
                              onClick={() =>
                                setAction({ client: c, decision: "Sent Back for Correction" })
                              }
                            >
                              <RotateCcw className="h-3.5 w-3.5" /> Send back
                            </Button>
                          )}
                          {canRejectClient(user, c, userPermissions) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600"
                              onClick={() => setAction({ client: c, decision: "Rejected" })}
                            >
                              <X className="h-3.5 w-3.5" /> Reject
                            </Button>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">View only</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={!!action} onOpenChange={(open) => !open && setAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action?.decision} — {action?.client.name}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder={
              noteRequired
                ? "Rejection / Correction Notes (required)"
                : "Add a reviewer note (optional)"
            }
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          {noteMissing && (
            <p className="text-[12px] text-red-600">
              A note is required when rejecting or sending back for correction.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>
              Cancel
            </Button>
            <Button onClick={confirm} disabled={busy || noteMissing}>
              {busy ? "Saving…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-elevated p-4">
      <div className="text-[12px] text-muted-foreground">{label}</div>
      <div className="mt-1 text-[24px] font-semibold tracking-tight">{value}</div>
    </div>
  );
}
