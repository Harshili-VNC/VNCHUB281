import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Plus, Search, SendHorizonal, UsersRound, Building2, MapPin, Phone, CreditCard, Laptop, ShieldCheck, HelpCircle } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useAuth } from "@/lib/auth";
import {
  useWorkspace,
  businessUnits,
  billingEntities,
  clientCurrencies,
  contractTypes,
  billingFrequencies,
  billingTypes,
  clientSupportLevels,
  clientStatuses,
  nonActiveClientReasons,
  softwareCategories,
} from "@/lib/workspace";
import type { ClientRecord } from "@/lib/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TeamOwnershipDialog } from "@/components/shared/TeamOwnershipDialog";

export const Route = createFileRoute("/clients")({
  head: () => ({
    meta: [
      { title: "Client Master · VNC Global" },
      { name: "description", content: "Client master data, contracts, software stack, and approval workflow." },
    ],
  }),
  component: ClientsPage,
});

const ALL = "all";

function emptyForm() {
  return {
    name: "",
    legalName: "",
    shortName: "",
    businessUnit: businessUnits[0],
    billingEntity: billingEntities[0],
    currency: clientCurrencies[0],
    clientSupportLevel: clientSupportLevels[0],
    companyPhoneNumber: "",
    status: "Active" as const,
    // Section 2: Address
    clientAddressLine1: "",
    clientAddressLine2: "",
    clientCountry: "",
    clientStateOrRegion: "",
    clientCity: "",
    clientZipOrPin: "",
    // Section 4: Billing & Contract
    contractType: contractTypes[0],
    contractStart: "",
    billingStartDate: "",
    contractEnd: "",
    contractRenewalDate: "",
    billingFrequency: billingFrequencies[2], // Monthly
    billingType: billingTypes[0], // Fixed Fees
    oneOffDurationDays: 0,
    billingNotes: "",
    paymentTerms: "",
    // Section 5: Accounts
    numberOfAccounts: 1,
    // Section 7: Commercial
    applicableServiceCodes: "",
    contractCopyLink: "",
    scopeSummary: "",
    commercialNotes: "",
    // Section 11: Non-Active Reason
    nonActiveReason: nonActiveClientReasons[0],
    nonActiveOtherReasonText: "",
  };
}

function ClientsPage() {
  const { user, people } = useAuth();
  const { clients, addClient, updateClient, submitClientForReview, createExport } = useWorkspace();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState(ALL);
  const [recordStatus, setRecordStatus] = useState(ALL);
  const [bu, setBu] = useState(ALL);
  const [showForm, setShowForm] = useState(false);
  const [activeFormTab, setActiveFormTab] = useState<"identity" | "address" | "billing" | "accounts" | "commercial">("identity");
  const [editing, setEditing] = useState<ClientRecord | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [ownershipClient, setOwnershipClient] = useState<ClientRecord | null>(null);

  const canManage = user?.departmentFunction === "Finance" || user?.departmentFunction === "Admin" || user?.departmentFunction === "Leadership";
  const canAssignOwnership =
    (user?.isBusinessUnitHead ?? false) ||
    user?.departmentFunction === "Finance" ||
    user?.departmentFunction === "Admin" ||
    user?.departmentFunction === "Leadership";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter((c) => {
      if (q && !`${c.name} ${c.code ?? ""} ${c.legalName ?? ""}`.toLowerCase().includes(q))
        return false;
      if (status !== ALL && c.status !== status) return false;
      if (recordStatus !== ALL && c.recordStatus !== recordStatus) return false;
      if (bu !== ALL && c.businessUnit !== bu) return false;
      return true;
    });
  }, [clients, query, status, recordStatus, bu]);

  const activeCount = clients.filter((c) => c.status === "Active").length;
  const pendingCount = clients.filter(
    (c) => c.recordStatus === "Under Review" || c.recordStatus === "Sent Back for Correction",
  ).length;

  function openNew() {
    setEditing(null);
    setForm(emptyForm());
    setActiveFormTab("identity");
    setShowForm(true);
  }

  function openEdit(c: ClientRecord) {
    setEditing(c);
    setForm({
      name: c.name,
      legalName: c.legalName ?? "",
      shortName: c.shortName ?? "",
      businessUnit: c.businessUnit ?? businessUnits[0],
      billingEntity: c.billingEntity ?? billingEntities[0],
      currency: c.currency ?? clientCurrencies[0],
      clientSupportLevel: c.clientSupportLevel ?? clientSupportLevels[0],
      companyPhoneNumber: c.companyPhoneNumber ?? "",
      status: c.status,
      clientAddressLine1: c.clientAddressLine1 ?? "",
      clientAddressLine2: c.clientAddressLine2 ?? "",
      clientCountry: c.clientCountry ?? "",
      clientStateOrRegion: c.clientStateOrRegion ?? "",
      clientCity: c.clientCity ?? "",
      clientZipOrPin: c.clientZipOrPin ?? "",
      contractType: c.contractType ?? contractTypes[0],
      contractStart: c.contractStart ?? "",
      billingStartDate: c.billingStartDate ?? "",
      contractEnd: c.contractEnd ?? "",
      contractRenewalDate: c.contractRenewalDate ?? "",
      billingFrequency: c.billingFrequency ?? billingFrequencies[2],
      billingType: c.billingType ?? billingTypes[0],
      oneOffDurationDays: c.oneOffDurationDays ?? 0,
      billingNotes: c.billingNotes ?? "",
      paymentTerms: c.paymentTerms ?? "",
      numberOfAccounts: c.numberOfAccounts ?? 1,
      applicableServiceCodes: c.applicableServiceCodes ?? "",
      contractCopyLink: c.contractCopyLink ?? "",
      scopeSummary: c.scopeSummary ?? "",
      commercialNotes: c.commercialNotes ?? "",
      nonActiveReason: c.nonActiveReason ?? nonActiveClientReasons[0],
      nonActiveOtherReasonText: c.nonActiveOtherReasonText ?? "",
    });
    setActiveFormTab("identity");
    setShowForm(true);
  }

  async function save() {
    if (!form.name.trim()) {
      toast.error("Client name is required");
      return;
    }
    setSaving(true);
    const result = editing ? await updateClient(editing.id, form) : await addClient(form);
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(editing ? "Client record updated" : "Client created as Draft");
    setShowForm(false);
  }

  async function submit(c: ClientRecord) {
    const result = await submitClientForReview(c.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Submitted for approval review");
  }

  async function exportCsv() {
    const result = await createExport({ module: "Client Master" });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vnc-clients-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${result.rowCount} clients`);
  }

  return (
    <AppShell>
      <div className="px-8 pt-8 pb-4">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0">
            <div className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
              Masters
            </div>
            <h1 className="mt-1 text-[28px] font-semibold tracking-tight leading-tight">
              Client Master (Spec v1.0)
            </h1>
            <p className="mt-1 text-[13.5px] text-muted-foreground max-w-2xl">
              {clients.length} clients · {activeCount} active · {pendingCount} pending approval
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
            {canManage && (
              <Button size="sm" onClick={openNew}>
                <Plus className="h-3.5 w-3.5" /> New client master
              </Button>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <div className="h-9 flex items-center gap-2 px-2.5 rounded-lg bg-elevated border border-border w-full max-w-xs">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search code, name, legal name…"
              className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-muted-foreground"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-[140px] text-[13px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="On Hold">On Hold</SelectItem>
              <SelectItem value="Non Active">Non Active</SelectItem>
            </SelectContent>
          </Select>
          <Select value={recordStatus} onValueChange={setRecordStatus}>
            <SelectTrigger className="h-9 w-[170px] text-[13px]">
              <SelectValue placeholder="Record status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All record statuses</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Under Review">Under Review</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Sent Back for Correction">Sent Back</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={bu} onValueChange={setBu}>
            <SelectTrigger className="h-9 w-[110px] text-[13px]">
              <SelectValue placeholder="BU" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All BUs</SelectItem>
              {businessUnits.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="px-8 pb-10">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface/40 px-5 py-14 text-center text-[13px] text-muted-foreground">
            No clients match your filters.
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-elevated overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Client Identity</TableHead>
                  <TableHead>BU / Entity</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Accounts</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Approval</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-xs">{c.code ?? "—"}</TableCell>
                    <TableCell>
                      <div className="font-medium">{c.name}</div>
                      {c.legalName && <div className="text-xs text-muted-foreground">{c.legalName}</div>}
                    </TableCell>
                    <TableCell className="text-xs">
                      {c.businessUnit ?? "—"} / {c.billingEntity ?? "—"} ({c.currency ?? "USD"})
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.clientCity ? `${c.clientCity}, ${c.clientCountry}` : "—"}
                    </TableCell>
                    <TableCell className="text-xs">{c.numberOfAccounts ?? 1} account(s)</TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={c.recordStatus} />
                    </TableCell>
                    <TableCell className="text-right space-x-1 whitespace-nowrap">
                      {canManage && (
                        <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                          Edit
                        </Button>
                      )}
                      {canManage && (c.recordStatus === "Draft" || c.recordStatus === "Sent Back for Correction") ? (
                        <Button variant="ghost" size="sm" onClick={() => submit(c)}>
                          <SendHorizonal className="h-3.5 w-3.5" /> Submit
                        </Button>
                      ) : null}
                      {canAssignOwnership && c.recordStatus === "Approved" ? (
                        <Button variant="ghost" size="sm" onClick={() => setOwnershipClient(c)}>
                          <UsersRound className="h-3.5 w-3.5" /> Assign team
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Tabbed Client Master Form Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit Client (${editing.code ?? "Draft"})` : "New Client Master Record"}</DialogTitle>
            <DialogDescription>
              Client Master Spec v1.0 — Fill in the required client sections below.
            </DialogDescription>
          </DialogHeader>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 border-b border-border pb-2">
            {[
              { id: "identity", label: "1. Identity", icon: Building2 },
              { id: "address", label: "2. Address", icon: MapPin },
              { id: "billing", label: "3. Contract & Billing", icon: CreditCard },
              { id: "accounts", label: "4. Accounts & Structure", icon: Laptop },
              { id: "commercial", label: "5. Commercial & Notes", icon: ShieldCheck },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFormTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                  activeFormTab === tab.id
                    ? "bg-foreground text-background font-semibold"
                    : "text-muted-foreground hover:bg-surface-2"
                }`}
              >
                <tab.icon className="h-3.5 w-3.5" /> {tab.label}
              </button>
            ))}
          </div>

          {/* Section 1: Identity */}
          {activeFormTab === "identity" && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="col-span-2">
                <Label>Client Display Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Acme Corp" />
              </div>
              <div className="col-span-2">
                <Label>Legal Registered Name</Label>
                <Input value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} placeholder="Acme International Ltd" />
              </div>
              <div>
                <Label>Short Name / Abbreviation</Label>
                <Input value={form.shortName} onChange={(e) => setForm({ ...form, shortName: e.target.value })} placeholder="ACME" />
              </div>
              <div>
                <Label>Client Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {clientStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {form.status === "Non Active" && (
                <div className="col-span-2 p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-2">
                  <Label className="text-rose-600 font-medium">Reason for Non-Active Status *</Label>
                  <Select value={form.nonActiveReason} onValueChange={(v) => setForm({ ...form, nonActiveReason: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {nonActiveClientReasons.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {form.nonActiveReason === "Other" && (
                    <Input
                      placeholder="Specify non-active reason details…"
                      value={form.nonActiveOtherReasonText}
                      onChange={(e) => setForm({ ...form, nonActiveOtherReasonText: e.target.value })}
                    />
                  )}
                </div>
              )}

              <div>
                <Label>Primary Business Unit</Label>
                <Select value={form.businessUnit} onValueChange={(v) => setForm({ ...form, businessUnit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{businessUnits.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Billing Entity</Label>
                <Select value={form.billingEntity} onValueChange={(v) => setForm({ ...form, billingEntity: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{billingEntities.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Invoice Currency</Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{clientCurrencies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Client Support Level</Label>
                <Select value={form.clientSupportLevel} onValueChange={(v) => setForm({ ...form, clientSupportLevel: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{clientSupportLevels.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Company Phone Number</Label>
                <Input value={form.companyPhoneNumber} onChange={(e) => setForm({ ...form, companyPhoneNumber: e.target.value })} placeholder="+1 555-0199" />
              </div>
            </div>
          )}

          {/* Section 2: Address */}
          {activeFormTab === "address" && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="col-span-2">
                <Label>Address Line 1</Label>
                <Input value={form.clientAddressLine1} onChange={(e) => setForm({ ...form, clientAddressLine1: e.target.value })} placeholder="Suite 400, 100 Main St" />
              </div>
              <div className="col-span-2">
                <Label>Address Line 2</Label>
                <Input value={form.clientAddressLine2} onChange={(e) => setForm({ ...form, clientAddressLine2: e.target.value })} />
              </div>
              <div>
                <Label>City</Label>
                <Input value={form.clientCity} onChange={(e) => setForm({ ...form, clientCity: e.target.value })} />
              </div>
              <div>
                <Label>State / Region</Label>
                <Input value={form.clientStateOrRegion} onChange={(e) => setForm({ ...form, clientStateOrRegion: e.target.value })} />
              </div>
              <div>
                <Label>Country</Label>
                <Input value={form.clientCountry} onChange={(e) => setForm({ ...form, clientCountry: e.target.value })} placeholder="Australia" />
              </div>
              <div>
                <Label>Zip / PIN Code</Label>
                <Input value={form.clientZipOrPin} onChange={(e) => setForm({ ...form, clientZipOrPin: e.target.value })} />
              </div>
            </div>
          )}

          {/* Section 4: Billing & Contract */}
          {activeFormTab === "billing" && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <Label>Contract Type</Label>
                <Select value={form.contractType} onValueChange={(v) => setForm({ ...form, contractType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{contractTypes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Billing Frequency</Label>
                <Select value={form.billingFrequency} onValueChange={(v) => setForm({ ...form, billingFrequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{billingFrequencies.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Billing Type</Label>
                <Select value={form.billingType} onValueChange={(v) => setForm({ ...form, billingType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{billingTypes.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Contract Start Date</Label>
                <Input type="date" value={form.contractStart} onChange={(e) => setForm({ ...form, contractStart: e.target.value })} />
              </div>
              <div>
                <Label>Billing Start Date</Label>
                <Input type="date" value={form.billingStartDate} onChange={(e) => setForm({ ...form, billingStartDate: e.target.value })} />
              </div>
              <div>
                <Label>Contract Renewal Date</Label>
                <Input type="date" value={form.contractRenewalDate} onChange={(e) => setForm({ ...form, contractRenewalDate: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Payment Terms</Label>
                <Input value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} placeholder="Net 30 days" />
              </div>
              <div className="col-span-2">
                <Label>Billing Notes & Special Instructions</Label>
                <Textarea value={form.billingNotes} onChange={(e) => setForm({ ...form, billingNotes: e.target.value })} rows={2} />
              </div>
            </div>
          )}

          {/* Section 5: Accounts & Structure */}
          {activeFormTab === "accounts" && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Number of Managed Accounts (1–10)</Label>
                  <Select
                    value={String(form.numberOfAccounts)}
                    onValueChange={(v) => setForm({ ...form, numberOfAccounts: Number(v) })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                        <SelectItem key={n} value={String(n)}>{n} Account(s)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="p-4 rounded-2xl border border-border bg-surface-2 text-xs space-y-2">
                <div className="font-semibold text-foreground flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-accent" /> Section 5 Account Configuration
                </div>
                <p className="text-muted-foreground">
                  This client is configured for <strong>{form.numberOfAccounts}</strong> account entity/entities. Individual account legal structures, addresses, and industry codes are managed under the client account profile after creation.
                </p>
              </div>
            </div>
          )}

          {/* Section 7: Commercial */}
          {activeFormTab === "commercial" && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="col-span-2">
                <Label>Applicable Service Codes</Label>
                <Input value={form.applicableServiceCodes} onChange={(e) => setForm({ ...form, applicableServiceCodes: e.target.value })} placeholder="BK-01, TAX-02, EFA-RET" />
              </div>
              <div className="col-span-2">
                <Label>Contract Copy / Document Storage Link</Label>
                <Input value={form.contractCopyLink} onChange={(e) => setForm({ ...form, contractCopyLink: e.target.value })} placeholder="https://drive.google.com/…" />
              </div>
              <div className="col-span-2">
                <Label>Scope Summary</Label>
                <Textarea value={form.scopeSummary} onChange={(e) => setForm({ ...form, scopeSummary: e.target.value })} rows={2} placeholder="Full end-to-end bookkeeping, payroll, and monthly BAS lodgement…" />
              </div>
              <div className="col-span-2">
                <Label>Commercial & Escalation Notes</Label>
                <Textarea value={form.commercialNotes} onChange={(e) => setForm({ ...form, commercialNotes: e.target.value })} rows={2} />
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Record"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TeamOwnershipDialog
        client={ownershipClient}
        people={people}
        onClose={() => setOwnershipClient(null)}
      />
    </AppShell>
  );
}
