import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ClipboardCheck,
  Download,
  History,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { useAuth, getDirectReports, getVisiblePeople } from "@/lib/auth";
import {
  useWorkspace,
  pendingLeaveForApprover,
  myLeaveRequests,
  peopleOnLeaveToday,
  type LeaveRequest,
  type LeaveStatus,
} from "@/lib/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/leave")({
  head: () => ({
    meta: [
      { title: "Leave & Time Off · VNC Global" },
      { name: "description", content: "Request leave, approve requests, and see who's out today." },
      { property: "og:title", content: "Leave & Time Off · VNC Global" },
      { property: "og:description", content: "Leave requests and approvals scoped to your role." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LeavePage,
});

const statusTone: Record<LeaveStatus, string> = {
  pending: "bg-[color:var(--warning)]/15 text-[color:var(--warning)]",
  approved: "bg-[color:var(--success)]/12 text-[color:var(--success)]",
  rejected: "bg-[color:var(--danger)]/12 text-[color:var(--danger)]",
};

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

function LeavePage() {
  const { user, people } = useAuth();
  const { leaveRequests, decideLeave } = useWorkspace();
  const [requestOpen, setRequestOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<"all" | LeaveStatus>("all");

  if (!user) return null;

  const isTopLevel =
    user.departmentFunction === "Leadership" || user.departmentFunction === "Admin";
  const reports = getDirectReports(people, user.id);
  const canApprove = reports.length > 0;
  const canRequest = Boolean(user.managerId);

  const pending = pendingLeaveForApprover(leaveRequests, user.id);
  const mine = myLeaveRequests(leaveRequests, user.id);
  const visibleIds = new Set(getVisiblePeople(people, user).map((p) => p.id));
  const onLeaveToday = peopleOnLeaveToday(leaveRequests, people, visibleIds).filter(
    (p) => p.id !== user.id,
  );

  const companyWide = [...leaveRequests]
    .filter((r) => historyFilter === "all" || r.status === historyFilter)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  function personName(id: string) {
    return people.find((p) => p.id === id)?.name ?? "—";
  }

  function handleExport() {
    if (!user) return;
    const isTopLevel =
      user.departmentFunction === "Leadership" || user.departmentFunction === "Admin";
    const source = isTopLevel ? leaveRequests : [...pending, ...mine];
    const seen = new Set<string>();
    const rows = source.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
    const header = ["Employee", "Manager", "Start", "End", "Reason", "Status"];
    const lines = rows.map((r) =>
      [personName(r.personId), personName(r.managerId), r.startDate, r.endDate, r.reason, r.status]
        .map(escapeCsvCell)
        .join(","),
    );
    downloadCsv(
      `vnc-leave-${new Date().toISOString().slice(0, 10)}.csv`,
      [header.join(","), ...lines].join("\n"),
    );
  }

  async function handleDecision(request: LeaveRequest, decision: "approved" | "rejected") {
    const result = await decideLeave(request.id, decision);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`${personName(request.personId)}'s request ${decision}`);
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Workspace"
        title="Leave & Time Off"
        description={
          canApprove && canRequest
            ? "Request your own leave and approve requests from your team."
            : canApprove
              ? "Approve leave requests from your team."
              : "Request leave and track your history."
        }
        showToolbar={false}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport} className="gap-1.5">
              <Download className="h-4 w-4" /> Export
            </Button>
            {canRequest && (
              <Button onClick={() => setRequestOpen(true)} className="gap-1.5">
                <CalendarPlus className="h-4 w-4" /> Request leave
              </Button>
            )}
          </div>
        }
      />

      <div className="px-8 pb-10 space-y-8">
        {canApprove && (
          <section>
            <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold">
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" /> Needs your approval
              <span className="text-muted-foreground font-normal">· {pending.length}</span>
            </div>
            {pending.length === 0 ? (
              <EmptyState text="No pending requests right now." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pending.map((request) => (
                  <div
                    key={request.id}
                    className="rounded-2xl border border-border bg-elevated p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-[13.5px] font-semibold">
                        {personName(request.personId)}
                      </div>
                      <Badge className={`${statusTone.pending} border-transparent capitalize`}>
                        Pending
                      </Badge>
                    </div>
                    <div className="mt-1 text-[12px] text-muted-foreground">
                      {request.startDate} → {request.endDate}
                    </div>
                    {request.reason && (
                      <p className="mt-2 text-[12px] leading-5">{request.reason}</p>
                    )}
                    <div className="mt-4 flex gap-2">
                      <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={() => handleDecision(request, "approved")}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => handleDecision(request, "rejected")}
                      >
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <section>
          <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold">
            <CalendarDays className="h-4 w-4 text-muted-foreground" /> On leave today
            <span className="text-muted-foreground font-normal">· {onLeaveToday.length}</span>
          </div>
          {onLeaveToday.length === 0 ? (
            <EmptyState text="Everyone in your view is in today." />
          ) : (
            <div className="flex flex-wrap gap-2">
              {onLeaveToday.map((person) => (
                <div
                  key={person.id}
                  className="flex items-center gap-2 rounded-full border border-border bg-elevated pl-1.5 pr-3 py-1.5"
                >
                  <div className="h-6 w-6 rounded-full bg-[image:var(--gradient-primary)] grid place-items-center text-[10px] font-semibold text-white">
                    {person.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <span className="text-[12.5px] font-medium">{person.name}</span>
                  <span className="text-[11px] text-muted-foreground">{person.designation ?? person.departmentFunction}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {isTopLevel && (
          <section>
            <div className="mb-3 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-[13px] font-semibold">
                <History className="h-4 w-4 text-muted-foreground" /> All leave requests ·
                company-wide
                <span className="text-muted-foreground font-normal">· {companyWide.length}</span>
              </div>
              <div className="flex gap-1.5">
                {(["all", "pending", "approved", "rejected"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setHistoryFilter(filter)}
                    className={`h-7 px-2.5 rounded-md text-[11.5px] font-medium capitalize transition ${
                      historyFilter === filter
                        ? "bg-surface-2 border border-border-strong"
                        : "text-muted-foreground hover:bg-surface-2 border border-transparent"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
            {companyWide.length === 0 ? (
              <EmptyState text="No requests match this filter." />
            ) : (
              <div className="rounded-2xl border border-border bg-elevated overflow-hidden shadow-sm">
                <table className="w-full text-[13px]">
                  <thead className="bg-surface-2/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <Th>Employee</Th>
                      <Th>Manager</Th>
                      <Th>Dates</Th>
                      <Th>Reason</Th>
                      <Th>Status</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {companyWide.map((request, i) => (
                      <tr
                        key={request.id}
                        className={`border-t border-border ${i % 2 === 1 ? "bg-surface/40" : ""}`}
                      >
                        <td className="px-5 py-3 font-medium">{personName(request.personId)}</td>
                        <td className="px-5 py-3 text-muted-foreground">
                          {personName(request.managerId)}
                        </td>
                        <td className="px-5 py-3 num">
                          {request.startDate} → {request.endDate}
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">{request.reason || "—"}</td>
                        <td className="px-5 py-3">
                          <Badge
                            variant="secondary"
                            className={`${statusTone[request.status]} border-transparent capitalize`}
                          >
                            {request.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {canRequest && (
          <section>
            <div className="mb-3 text-[13px] font-semibold">Your requests</div>
            {mine.length === 0 ? (
              <EmptyState text="You haven't requested any leave yet." />
            ) : (
              <div className="rounded-2xl border border-border bg-elevated overflow-hidden shadow-sm">
                <table className="w-full text-[13px]">
                  <thead className="bg-surface-2/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <Th>Dates</Th>
                      <Th>Reason</Th>
                      <Th>Status</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {mine.map((request, i) => (
                      <tr
                        key={request.id}
                        className={`border-t border-border ${i % 2 === 1 ? "bg-surface/40" : ""}`}
                      >
                        <td className="px-5 py-3 num">
                          {request.startDate} → {request.endDate}
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">{request.reason || "—"}</td>
                        <td className="px-5 py-3">
                          <Badge
                            variant="secondary"
                            className={`${statusTone[request.status]} border-transparent capitalize`}
                          >
                            {request.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>

      {canRequest && <RequestLeaveDialog open={requestOpen} onOpenChange={setRequestOpen} />}
    </AppShell>
  );
}

function RequestLeaveDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { requestLeave } = useWorkspace();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  function reset() {
    setStartDate("");
    setEndDate("");
    setReason("");
    setError("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const result = await requestLeave({ startDate, endDate, reason });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Leave request sent for approval");
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request leave</DialogTitle>
          <DialogDescription>This goes to your manager for approval.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="leave-start">Start date</Label>
              <Input
                id="leave-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="leave-end">End date</Label>
              <Input
                id="leave-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="leave-reason">Reason</Label>
            <Textarea
              id="leave-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Family function"
            />
          </div>
          {error && (
            <p className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-xs text-danger">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit">Send request</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface/40 px-5 py-10 text-center text-[13px] text-muted-foreground">
      {text}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left font-semibold px-5 py-3">{children}</th>;
}
