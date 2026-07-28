import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useWorkspace } from "@/lib/workspace";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/client-change-requests")({
  head: () => ({
    meta: [{ title: "Client Change Requests · VNC Global" }],
  }),
  component: ChangeRequestsPage,
});

const FIELDS = ["Business Unit", "Billing Entity", "Client Status"] as const;

function ChangeRequestsPage() {
  const { clients, clientChangeRequests, addClientChangeRequest, applyClientChangeRequest } =
    useWorkspace();
  const [showNew, setShowNew] = useState(false);
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

  async function apply(id: string) {
    const result = await applyClientChangeRequest(id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Change applied");
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
        <Button size="sm" onClick={() => setShowNew(true)}>
          <Plus className="h-3.5 w-3.5" /> New change request
        </Button>
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
                      <div className="text-xs text-muted-foreground">{clientName(r.clientId)}</div>
                    </TableCell>
                    <TableCell>{r.field}</TableCell>
                    <TableCell>{r.previousValue || "—"}</TableCell>
                    <TableCell>{r.newValue}</TableCell>
                    <TableCell>{r.effectiveFrom}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{r.reason || "—"}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {r.status === "Pending" ? (
                        <Button variant="ghost" size="sm" onClick={() => apply(r.id)}>
                          Apply now
                        </Button>
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
              <Select value={form.clientId} onValueChange={(v) => setForm({ ...form, clientId: v })}>
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
              <Input value={form.newValue} onChange={(e) => setForm({ ...form, newValue: e.target.value })} />
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
              <Label>Reason</Label>
              <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
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
    </AppShell>
  );
}
