import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useWorkspace } from "@/lib/workspace";
import { useAuth } from "@/lib/auth";
import { canRaiseChangeRequest, canApproveChangeRequest } from "@/lib/client-visibility";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/client-change-requests")({
  head: () => ({
    meta: [{ title: "Client Change Requests · VNC Global" }],
  }),
  component: ChangeRequestsPage,
});

const FIELDS = ["Business Unit", "Billing Entity", "Client Status"] as const;
function ChangeRequestsPage() {
  const { user } = useAuth();
  const {
    clients,
    clientChangeRequests,
    addClientChangeRequest,
    decideClientChangeRequest,
    openClient360,
  } = useWorkspace();
  const [showNew, setShowNew] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [reviewDecision, setReviewDecision] = useState<"Approved" | "Rejected" | "Sent Back">(
    "Approved",
  );
  const [reviewNote, setReviewNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    clientId: "",
    field: FIELDS[0] as (typeof FIELDS)[number],
    newValue: "",
    effectiveFrom: "",
    reason: "",
  });

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? "—";
  const clientCode = (id: string) => clients.find((c) => c.id === id)?.code ?? "—";

  async function submit() {
    if (!form.clientId || !form.newValue || !form.effectiveFrom) {
      toast.error("Client, new value, and effective date are required");
      return;
    }
    if (!form.reason.trim()) {
      toast.error("Change Reason is required");
      return;
    }
    setBusy(true);
    const result = await addClientChangeRequest(form);
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Change request raised");
    setShowNew(false);
    setForm({ clientId: "", field: FIELDS[0], newValue: "", effectiveFrom: "", reason: "" });
  }

  async function submitReview() {
    if (!selectedRequest) return;
    if (reviewDecision !== "Approved" && !reviewNote.trim()) {
      toast.error("Please enter a remark or reason for rejection/correction");
      return;
    }
    setBusy(true);
    const result = await decideClientChangeRequest(selectedRequest.id, reviewDecision, reviewNote);
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Change request ${reviewDecision.toLowerCase()}`);
    setShowReview(false);
    setSelectedRequest(null);
    setReviewNote("");
  }

  return (
    <AppShell>
      <div className="px-8 pt-8 pb-4 flex items-start justify-between gap-6 flex-wrap">
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
            Masters · Clients
          </div>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight leading-tight">
            Client Change Requests
          </h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground max-w-2xl">
            Effective-dated changes to Business Unit, Billing Entity, or Client Status.
          </p>
        </div>
        {canRaiseChangeRequest(user, null) && (
          <Button size="sm" onClick={() => setShowNew(true)}>
            <Plus className="h-3.5 w-3.5" /> New change request
          </Button>
        )}
      </div>

      <div className="px-8 pb-10">
        {clientChangeRequests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface/40 px-5 py-14 text-center text-[13px] text-muted-foreground">
            No change requests yet. Raise one to update a client's BU, Billing Entity, or Status
            with an effective date.
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-elevated overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Field</TableHead>
                  <TableHead>Previous</TableHead>
                  <TableHead>New value</TableHead>
                  <TableHead>Effective</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientChangeRequests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{clientCode(r.clientId)}</div>
                      <button
                        type="button"
                        onClick={() => openClient360(r.clientId)}
                        className="text-xs font-semibold text-foreground hover:text-accent hover:underline text-left cursor-pointer"
                      >
                        {clientName(r.clientId)}
                      </button>
                    </TableCell>
                    <TableCell>{r.field}</TableCell>
                    <TableCell>{r.previousValue || "—"}</TableCell>
                    <TableCell>{r.newValue}</TableCell>
                    <TableCell>{r.effectiveFrom}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{r.reason || "—"}</TableCell>
                    <TableCell>
                      <StatusBadge
                        status={r.status === "Pending" && r.reviewedBy ? "Approved" : r.status}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {r.status === "Pending" &&
                      !r.reviewedBy &&
                      canApproveChangeRequest(user, clients.find((c) => c.id === r.clientId) ?? null) ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(r);
                            setReviewDecision("Approved");
                            setReviewNote("");
                            setShowReview(true);
                          }}
                        >
                          Review
                        </Button>
                      ) : r.status === "Pending" && r.reviewedBy ? (
                        <span className="text-xs text-emerald-600 font-semibold">
                          Approved (Future)
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Raise change request</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Client</Label>
              <Select
                value={form.clientId}
                onValueChange={(v) => setForm({ ...form, clientId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code ? `${c.code} — ${c.name}` : c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Field</Label>
              <Select
                value={form.field}
                onValueChange={(v) => setForm({ ...form, field: v as (typeof FIELDS)[number] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELDS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>New value</Label>
              <Input
                value={form.newValue}
                onChange={(e) => setForm({ ...form, newValue: e.target.value })}
              />
            </div>
            <div>
              <Label>Effective from</Label>
              <Input
                type="date"
                value={form.effectiveFrom}
                onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
              />
            </div>
            <div>
              <Label>
                Reason <span className="text-rose-500 font-bold">*</span>
              </Label>
              <Textarea
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className={!form.reason.trim() ? "border-rose-500/50" : ""}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy}>
              {busy ? "Submitting…" : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReview} onOpenChange={setShowReview}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Review Change Request</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-surface-2 rounded-xl border border-border space-y-1.5">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-medium">
                    Client
                  </span>
                  <span className="font-semibold">
                    {clientCode(selectedRequest.clientId)} — {clientName(selectedRequest.clientId)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-medium">
                      Field
                    </span>
                    <span className="font-semibold">{selectedRequest.field}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-medium">
                      Effective Date
                    </span>
                    <span className="font-semibold">{selectedRequest.effectiveFrom}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-medium">
                      Previous Value
                    </span>
                    <span className="font-semibold text-muted-foreground line-through">
                      {selectedRequest.previousValue || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-medium">
                      New Value
                    </span>
                    <span className="font-semibold text-emerald-600">
                      {selectedRequest.newValue}
                    </span>
                  </div>
                </div>
                {selectedRequest.reason && (
                  <div className="pt-1 border-t border-border/50">
                    <span className="text-muted-foreground block text-[10px] uppercase font-medium">
                      Request Reason
                    </span>
                    <p className="mt-0.5 text-muted-foreground leading-relaxed">
                      {selectedRequest.reason}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label>Decision</Label>
                <Select value={reviewDecision} onValueChange={(v) => setReviewDecision(v as any)}>
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Approved">Approve</SelectItem>
                    <SelectItem value="Rejected">Reject</SelectItem>
                    <SelectItem value="Sent Back">Send Back for Correction</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Review Remarks / Notes {reviewDecision !== "Approved" && "*"}</Label>
                <Textarea
                  placeholder={
                    reviewDecision === "Approved"
                      ? "Optional notes..."
                      : "Please enter the reason for rejecting or sending back..."
                  }
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowReview(false);
                setSelectedRequest(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={submitReview} disabled={busy}>
              {busy ? "Processing…" : "Submit Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
