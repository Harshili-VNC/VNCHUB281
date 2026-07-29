import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Plus, Search, SendHorizonal, UsersRound, Building2, MapPin, Phone, CreditCard, Laptop, ShieldCheck, HelpCircle, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft } from "lucide-react";
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
import { isSuperUser, isBUHead, canCreateClient, canEditClient, canSubmitClient, canManageTeam } from "@/lib/client-visibility";

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

type FormTab = "identity" | "address" | "billing" | "accounts" | "commercial";
const formTabOrder: FormTab[] = ["identity", "address", "billing", "accounts", "commercial"];

export type AccountFormItem = {
  accountName: string;
  accountCode: string;
  isPrimaryAccount: boolean;
  isInScope: boolean;
  accountStatus: "Active" | "Inactive";
  accountLegalStructure: string;
  billingEntity: string;
  currency: string;
  taxRegistrationNumber: string;
  addressLine1: string;
  addressLine2: string;
  country: string;
  stateOrRegion: string;
  city: string;
  zipOrPinCode: string;
  deliveryLocation: string;
  industryCode: string;
  subIndustry: string;
  businessUnitMapping: string;
  revenueLast1Year: string;
  employeeSize: string;
  website: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;
};

export function createEmptyAccount(index: number, isPrimary = false): AccountFormItem {
  return {
    accountName: "",
    accountCode: "",
    isPrimaryAccount: isPrimary,
    isInScope: true,
    accountStatus: "Active",
    accountLegalStructure: "",
    billingEntity: "",
    currency: "",
    taxRegistrationNumber: "",
    addressLine1: "",
    addressLine2: "",
    country: "",
    stateOrRegion: "",
    city: "",
    zipOrPinCode: "",
    deliveryLocation: "",
    industryCode: "",
    subIndustry: "",
    businessUnitMapping: "",
    revenueLast1Year: "",
    employeeSize: "",
    website: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    notes: "",
  };
}

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
    status: "Active" as "Active" | "On Hold" | "Non Active",
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
    accounts: [createEmptyAccount(1, true)],
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

type ClientFormType = ReturnType<typeof emptyForm>;

function getSectionErrors(tab: FormTab, f: ClientFormType): string[] {
  const errors: string[] = [];
  if (tab === "identity") {
    if (!f.name.trim()) errors.push("Client Display Name is required");
    if (!f.legalName.trim()) errors.push("Legal Registered Name is required");
    if (!f.businessUnit) errors.push("Primary Business Unit is required");
    if (!f.billingEntity) errors.push("Billing Entity is required");
    if (!f.currency) errors.push("Invoice Currency is required");
    if (!f.clientSupportLevel) errors.push("Client Support Level is required");
    if (!f.companyPhoneNumber.trim()) errors.push("Company Phone Number is required");
    if (f.status === "Non Active") {
      if (!f.nonActiveReason) errors.push("Reason for Non-Active Status is required");
      if (f.nonActiveReason === "Other" && !f.nonActiveOtherReasonText.trim()) {
        errors.push("Non-Active reason details are required");
      }
    }
  } else if (tab === "address") {
    if (!f.clientAddressLine1.trim()) errors.push("Address Line 1 is required");
    if (!f.clientCity.trim()) errors.push("City is required");
    if (!f.clientStateOrRegion.trim()) errors.push("State / Region is required");
    if (!f.clientCountry.trim()) errors.push("Country is required");
    if (!f.clientZipOrPin.trim()) errors.push("Zip / PIN Code is required");
  } else if (tab === "billing") {
    if (!f.contractType) errors.push("Contract Type is required");
    if (!f.billingFrequency) errors.push("Billing Frequency is required");
    if (!f.billingType) errors.push("Billing Type is required");
    if (!f.contractStart) errors.push("Contract Start Date is required");
    if (!f.billingStartDate) errors.push("Billing Start Date is required");
    if (f.contractStart && f.billingStartDate && new Date(f.billingStartDate) < new Date(f.contractStart)) {
      errors.push("Billing Start Date must be on or after Contract Start Date");
    }
    if (!f.contractRenewalDate) errors.push("Contract Renewal Date is required");
  } else if (tab === "accounts") {
    if (!f.numberOfAccounts || f.numberOfAccounts < 1 || f.numberOfAccounts > 10) {
      errors.push("Number of Managed Accounts must be between 1 and 10");
    }
    if (!f.accounts || f.accounts.length !== f.numberOfAccounts) {
      errors.push(`Account count mismatch (${f.accounts?.length ?? 0} forms for ${f.numberOfAccounts} accounts)`);
    } else {
      f.accounts.forEach((acc, i) => {
        if (!acc.accountName.trim()) {
          errors.push(`Account #${i + 1} Name is required`);
        }
      });
      const primaryCount = f.accounts.filter((a) => a.isPrimaryAccount).length;
      if (primaryCount !== 1) {
        errors.push("Exactly one account must be marked as Primary");
      }
    }
  } else if (tab === "commercial") {
    if (!f.scopeSummary.trim()) errors.push("Scope Summary is required");
  }
  return errors;
}

function isSectionValid(tab: FormTab, f: ClientFormType): boolean {
  return getSectionErrors(tab, f).length === 0;
}

function getFirstInvalidSection(f: ClientFormType): { tab: FormTab; error: string } | null {
  for (const tab of formTabOrder) {
    const errs = getSectionErrors(tab, f);
    if (errs.length > 0) {
      return { tab, error: errs[0] };
    }
  }
  return null;
}

function ClientsPage() {
  const { user, people } = useAuth();
  const {
    clients,
    addClient,
    updateClient,
    submitClientForReview,
    createExport,
    openClient360,
    setClientAccounts,
    getClientAccounts,
  } = useWorkspace();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState(ALL);
  const [recordStatus, setRecordStatus] = useState(ALL);
  const [bu, setBu] = useState(ALL);
  const [showForm, setShowForm] = useState(false);
  const [activeFormTab, setActiveFormTab] = useState<FormTab>("identity");
  const [editing, setEditing] = useState<ClientRecord | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [ownershipClient, setOwnershipClient] = useState<ClientRecord | null>(null);

  const activeFormTabIndex = formTabOrder.indexOf(activeFormTab);
  const isFirstFormTab = activeFormTabIndex === 0;
  const isLastFormTab = activeFormTabIndex === formTabOrder.length - 1;

  function goToPrevFormTab() {
    if (!isFirstFormTab) setActiveFormTab(formTabOrder[activeFormTabIndex - 1]);
  }

  function goToNextFormTab() {
    const currentErrors = getSectionErrors(activeFormTab, form);
    if (currentErrors.length > 0) {
      toast.error(`Please complete current section: ${currentErrors[0]}`);
      return;
    }
    if (!isLastFormTab) {
      setActiveFormTab(formTabOrder[activeFormTabIndex + 1]);
    }
  }

  function handleTabClick(targetTab: FormTab) {
    const targetIdx = formTabOrder.indexOf(targetTab);
    if (targetIdx <= activeFormTabIndex) {
      setActiveFormTab(targetTab);
      return;
    }
    for (let i = 0; i < targetIdx; i++) {
      const stepTab = formTabOrder[i];
      const errs = getSectionErrors(stepTab, form);
      if (errs.length > 0) {
        toast.error(`Please complete ${stepTab.toUpperCase()} section first: ${errs[0]}`);
        setActiveFormTab(stepTab);
        return;
      }
    }
    setActiveFormTab(targetTab);
  }

  function getOwnershipButtonLabel(c: ClientRecord) {
    if (isBUHead(user) && !c.teamLeadId) return "Assign Team Lead";
    return "Manage Team";
  }

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

  async function openEdit(c: ClientRecord) {
    setEditing(c);
    const existingAccounts = await getClientAccounts(c.id);
    const num = c.numberOfAccounts || (existingAccounts.length > 0 ? existingAccounts.length : 1);
    const loadedAccounts: AccountFormItem[] = [];

    for (let i = 0; i < num; i++) {
      const existing = existingAccounts[i];
      if (existing) {
        loadedAccounts.push({
          accountName: existing.accountName ?? "",
          accountCode: existing.accountCode ?? "",
          isPrimaryAccount: existing.isPrimaryAccount ?? (i === 0),
          isInScope: existing.isInScope ?? true,
          accountStatus: (existing.accountStatus as "Active" | "Inactive") || "Active",
          accountLegalStructure: existing.accountLegalStructure ?? "",
          billingEntity: existing.billingEntity ?? "",
          currency: existing.currency ?? "",
          taxRegistrationNumber: existing.taxRegistrationNumber ?? "",
          addressLine1: existing.addressLine1 ?? "",
          addressLine2: existing.addressLine2 ?? "",
          country: existing.country ?? "",
          stateOrRegion: existing.stateOrRegion ?? "",
          city: existing.city ?? "",
          zipOrPinCode: existing.zipOrPinCode ?? "",
          deliveryLocation: existing.deliveryLocation ?? "",
          industryCode: existing.industryCode ?? "",
          subIndustry: existing.subIndustry ?? "",
          businessUnitMapping: existing.businessUnitMapping ?? "",
          revenueLast1Year: existing.revenueLast1Year ?? "",
          employeeSize: existing.employeeSize ?? "",
          website: existing.website ?? "",
          contactName: existing.contactName ?? "",
          contactEmail: existing.contactEmail ?? "",
          contactPhone: existing.contactPhone ?? "",
          notes: existing.notes ?? "",
        });
      } else {
        loadedAccounts.push(createEmptyAccount(i + 1, i === 0 && !loadedAccounts.some((a) => a.isPrimaryAccount)));
      }
    }

    if (loadedAccounts.length > 0 && !loadedAccounts.some((a) => a.isPrimaryAccount)) {
      loadedAccounts[0].isPrimaryAccount = true;
    }

    setForm({
      name: c.name,
      legalName: c.legalName ?? "",
      shortName: c.shortName ?? "",
      businessUnit: c.businessUnit ?? businessUnits[0],
      billingEntity: c.billingEntity ?? billingEntities[0],
      currency: c.currency ?? clientCurrencies[0],
      clientSupportLevel: c.clientSupportLevel ?? clientSupportLevels[0],
      companyPhoneNumber: c.companyPhoneNumber ?? "",
      status: (c.status as "Active" | "On Hold" | "Non Active") || "Active",
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
      numberOfAccounts: num,
      accounts: loadedAccounts,
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
    const invalidSection = getFirstInvalidSection(form);
    if (invalidSection) {
      setActiveFormTab(invalidSection.tab);
      toast.error(`Please complete mandatory details: ${invalidSection.error}`);
      return;
    }
    setSaving(true);
    const result = editing ? await updateClient(editing.id, form) : await addClient(form);
    if (!result.ok) {
      setSaving(false);
      toast.error(result.error);
      return;
    }
    const clientId = editing ? editing.id : (result as { id?: string }).id;
    if (clientId && form.accounts && form.accounts.length > 0) {
      const accRes = await setClientAccounts(clientId, form.accounts);
      if (!accRes.ok) {
        toast.error(`Client saved, but account error: ${accRes.error}`);
      }
    }
    setSaving(false);
    toast.success(editing ? "Client record updated" : "Client created as Draft");
    setShowForm(false);
  }

  function handleNumAccountsChange(targetNum: number) {
    const currentNum = form.numberOfAccounts;
    if (targetNum === currentNum) return;

    if (targetNum < currentNum) {
      const confirmRemove = window.confirm(
        `Reducing account count from ${currentNum} to ${targetNum} will remove Account #${targetNum + 1} to #${currentNum} and any details entered. Do you want to proceed?`
      );
      if (!confirmRemove) return;
    }

    const newAccounts: AccountFormItem[] = [];
    for (let i = 0; i < targetNum; i++) {
      if (form.accounts && form.accounts[i]) {
        newAccounts.push(form.accounts[i]);
      } else {
        newAccounts.push(createEmptyAccount(i + 1, i === 0 && !newAccounts.some((a) => a.isPrimaryAccount)));
      }
    }

    if (newAccounts.length > 0 && !newAccounts.some((a) => a.isPrimaryAccount)) {
      newAccounts[0].isPrimaryAccount = true;
    }

    setForm({
      ...form,
      numberOfAccounts: targetNum,
      accounts: newAccounts,
    });
  }

  function updateAccountField<K extends keyof AccountFormItem>(
    index: number,
    field: K,
    value: AccountFormItem[K]
  ) {
    const updated = [...form.accounts];
    if (!updated[index]) return;

    if (field === "isPrimaryAccount" && value === true) {
      updated.forEach((acc, i) => {
        acc.isPrimaryAccount = i === index;
      });
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }

    setForm({ ...form, accounts: updated });
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
            {canCreateClient(user) && (
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
                      <button
                        type="button"
                        onClick={() => openClient360(c)}
                        className="font-semibold text-foreground hover:text-accent hover:underline text-left cursor-pointer"
                      >
                        {c.name}
                      </button>
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
                      {canEditClient(user, c) && (
                        <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                          Edit
                        </Button>
                      )}
                      {canSubmitClient(user, c) && (c.recordStatus === "Draft" || c.recordStatus === "Sent Back for Correction") ? (
                        <Button variant="ghost" size="sm" onClick={() => submit(c)}>
                          <SendHorizonal className="h-3.5 w-3.5" /> Submit
                        </Button>
                      ) : null}
                      {canManageTeam(user, c) && c.recordStatus === "Approved" ? (
                        <Button variant="ghost" size="sm" onClick={() => setOwnershipClient(c)}>
                          <UsersRound className="h-3.5 w-3.5" /> {getOwnershipButtonLabel(c)}
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

      {/* Tabbed Client Master Form Modal with Step Validation */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <DialogTitle>{editing ? `Edit Client (${editing.code ?? "Draft"})` : "New Client Master Record"}</DialogTitle>
                <DialogDescription className="mt-0.5">
                  Client Master Spec v1.0 — Fill in all mandatory details section by section.
                </DialogDescription>
              </div>
              <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-accent/10 text-accent shrink-0">
                Step {activeFormTabIndex + 1} of 5
              </div>
            </div>
          </DialogHeader>

          {/* Tab Navigation with Validation Indicators */}
          <div className="flex items-center gap-1 border-b border-border pb-2 overflow-x-auto">
            {[
              { id: "identity" as FormTab, label: "1. Identity", icon: Building2 },
              { id: "address" as FormTab, label: "2. Address", icon: MapPin },
              { id: "billing" as FormTab, label: "3. Contract & Billing", icon: CreditCard },
              { id: "accounts" as FormTab, label: "4. Accounts & Structure", icon: Laptop },
              { id: "commercial" as FormTab, label: "5. Commercial & Notes", icon: ShieldCheck },
            ].map((tab) => {
              const valid = isSectionValid(tab.id, form);
              const isActive = activeFormTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabClick(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? "bg-foreground text-background font-semibold"
                      : valid
                      ? "text-foreground hover:bg-surface-2"
                      : "text-muted-foreground hover:bg-surface-2"
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                  {valid ? (
                    <CheckCircle2 className={`h-3.5 w-3.5 ${isActive ? "text-background" : "text-emerald-500"}`} />
                  ) : (
                    <span className="text-rose-500 text-xs font-bold">*</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Section Validation Banner */}
          {getSectionErrors(activeFormTab, form).length > 0 && (
            <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                Please fill in required fields in this section: <strong>{getSectionErrors(activeFormTab, form)[0]}</strong>
              </span>
            </div>
          )}

          {/* Section 1: Identity */}
          {activeFormTab === "identity" && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="col-span-2">
                <Label>Client Display Name <span className="text-rose-500 font-bold">*</span></Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Acme Corp"
                  className={!form.name.trim() ? "border-rose-500/50" : ""}
                />
              </div>
              <div className="col-span-2">
                <Label>Legal Registered Name <span className="text-rose-500 font-bold">*</span></Label>
                <Input
                  value={form.legalName}
                  onChange={(e) => setForm({ ...form, legalName: e.target.value })}
                  placeholder="Acme International Ltd"
                  className={!form.legalName.trim() ? "border-rose-500/50" : ""}
                />
              </div>
              <div>
                <Label>Short Name / Abbreviation</Label>
                <Input value={form.shortName} onChange={(e) => setForm({ ...form, shortName: e.target.value })} placeholder="ACME" />
              </div>
              <div>
                <Label>Client Status <span className="text-rose-500 font-bold">*</span></Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {clientStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {form.status === "Non Active" && (
                <div className="col-span-2 p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-2">
                  <Label className="text-rose-600 font-medium">Reason for Non-Active Status <span className="text-rose-500 font-bold">*</span></Label>
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
                      className={!form.nonActiveOtherReasonText.trim() ? "border-rose-500/50" : ""}
                    />
                  )}
                </div>
              )}

              <div>
                <Label>Primary Business Unit <span className="text-rose-500 font-bold">*</span></Label>
                <Select value={form.businessUnit} onValueChange={(v) => setForm({ ...form, businessUnit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{businessUnits.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Billing Entity <span className="text-rose-500 font-bold">*</span></Label>
                <Select value={form.billingEntity} onValueChange={(v) => setForm({ ...form, billingEntity: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{billingEntities.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Invoice Currency <span className="text-rose-500 font-bold">*</span></Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{clientCurrencies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Client Support Level <span className="text-rose-500 font-bold">*</span></Label>
                <Select value={form.clientSupportLevel} onValueChange={(v) => setForm({ ...form, clientSupportLevel: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{clientSupportLevels.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Company Phone Number <span className="text-rose-500 font-bold">*</span></Label>
                <Input
                  value={form.companyPhoneNumber}
                  onChange={(e) => setForm({ ...form, companyPhoneNumber: e.target.value })}
                  placeholder="+1 555-0199"
                  className={!form.companyPhoneNumber.trim() ? "border-rose-500/50" : ""}
                />
              </div>
            </div>
          )}

          {/* Section 2: Address */}
          {activeFormTab === "address" && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="col-span-2">
                <Label>Address Line 1 <span className="text-rose-500 font-bold">*</span></Label>
                <Input
                  value={form.clientAddressLine1}
                  onChange={(e) => setForm({ ...form, clientAddressLine1: e.target.value })}
                  placeholder="Suite 400, 100 Main St"
                  className={!form.clientAddressLine1.trim() ? "border-rose-500/50" : ""}
                />
              </div>
              <div className="col-span-2">
                <Label>Address Line 2</Label>
                <Input value={form.clientAddressLine2} onChange={(e) => setForm({ ...form, clientAddressLine2: e.target.value })} />
              </div>
              <div>
                <Label>City <span className="text-rose-500 font-bold">*</span></Label>
                <Input
                  value={form.clientCity}
                  onChange={(e) => setForm({ ...form, clientCity: e.target.value })}
                  className={!form.clientCity.trim() ? "border-rose-500/50" : ""}
                />
              </div>
              <div>
                <Label>State / Region <span className="text-rose-500 font-bold">*</span></Label>
                <Input
                  value={form.clientStateOrRegion}
                  onChange={(e) => setForm({ ...form, clientStateOrRegion: e.target.value })}
                  className={!form.clientStateOrRegion.trim() ? "border-rose-500/50" : ""}
                />
              </div>
              <div>
                <Label>Country <span className="text-rose-500 font-bold">*</span></Label>
                <Input
                  value={form.clientCountry}
                  onChange={(e) => setForm({ ...form, clientCountry: e.target.value })}
                  placeholder="Australia"
                  className={!form.clientCountry.trim() ? "border-rose-500/50" : ""}
                />
              </div>
              <div>
                <Label>Zip / PIN Code <span className="text-rose-500 font-bold">*</span></Label>
                <Input
                  value={form.clientZipOrPin}
                  onChange={(e) => setForm({ ...form, clientZipOrPin: e.target.value })}
                  className={!form.clientZipOrPin.trim() ? "border-rose-500/50" : ""}
                />
              </div>
            </div>
          )}

          {/* Section 4: Billing & Contract */}
          {activeFormTab === "billing" && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <Label>Contract Type <span className="text-rose-500 font-bold">*</span></Label>
                <Select value={form.contractType} onValueChange={(v) => setForm({ ...form, contractType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{contractTypes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Billing Frequency <span className="text-rose-500 font-bold">*</span></Label>
                <Select value={form.billingFrequency} onValueChange={(v) => setForm({ ...form, billingFrequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{billingFrequencies.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Billing Type <span className="text-rose-500 font-bold">*</span></Label>
                <Select value={form.billingType} onValueChange={(v) => setForm({ ...form, billingType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{billingTypes.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Contract Start Date <span className="text-rose-500 font-bold">*</span></Label>
                <Input
                  type="date"
                  value={form.contractStart}
                  onChange={(e) => setForm({ ...form, contractStart: e.target.value })}
                  className={!form.contractStart ? "border-rose-500/50" : ""}
                />
              </div>
              <div>
                <Label>Billing Start Date <span className="text-rose-500 font-bold">*</span></Label>
                <Input
                  type="date"
                  value={form.billingStartDate}
                  onChange={(e) => setForm({ ...form, billingStartDate: e.target.value })}
                  className={!form.billingStartDate ? "border-rose-500/50" : ""}
                />
              </div>
              <div>
                <Label>Contract Renewal Date <span className="text-rose-500 font-bold">*</span></Label>
                <Input
                  type="date"
                  value={form.contractRenewalDate}
                  onChange={(e) => setForm({ ...form, contractRenewalDate: e.target.value })}
                  className={!form.contractRenewalDate ? "border-rose-500/50" : ""}
                />
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
              <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border bg-surface-2">
                <div>
                  <Label className="text-xs font-semibold">Number of Managed Accounts (1–10) <span className="text-rose-500 font-bold">*</span></Label>
                  <p className="text-[11.5px] text-muted-foreground mt-0.5">
                    Dynamically generates detailed account forms for each managed entity.
                  </p>
                </div>
                <Select
                  value={String(form.numberOfAccounts)}
                  onValueChange={(v) => handleNumAccountsChange(Number(v))}
                >
                  <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} Account(s)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                {form.accounts.map((acc, idx) => {
                  const isValid = !!acc.accountName.trim();
                  return (
                    <div
                      key={idx}
                      className={`rounded-2xl border transition-all p-4 space-y-3 ${
                        acc.isPrimaryAccount
                          ? "border-accent/40 bg-accent/5 shadow-sm"
                          : isValid
                          ? "border-border bg-card"
                          : "border-rose-500/30 bg-rose-500/5"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="primaryAccountRadio"
                            id={`account-primary-${idx}`}
                            checked={acc.isPrimaryAccount}
                            onChange={() => updateAccountField(idx, "isPrimaryAccount", true)}
                            className="h-4 w-4 text-accent border-border accent-accent cursor-pointer"
                          />
                          <Label htmlFor={`account-primary-${idx}`} className="font-semibold text-sm cursor-pointer flex items-center gap-1.5">
                            Account #{idx + 1}: {acc.accountName.trim() || <span className="text-muted-foreground italic">Untitled Account</span>}
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          {acc.isPrimaryAccount && (
                            <span className="px-2.5 py-0.5 rounded-full bg-accent/20 text-accent font-semibold text-[10.5px]">
                              ★ Primary Account
                            </span>
                          )}
                          {isValid ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold text-[10.5px] flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Complete
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 font-semibold text-[10.5px] flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" /> Name Required
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Account Form Fields */}
                      <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                        <div className="col-span-2 sm:col-span-1">
                          <Label className="text-[11.5px]">Account Name <span className="text-rose-500 font-bold">*</span></Label>
                          <Input
                            value={acc.accountName}
                            onChange={(e) => updateAccountField(idx, "accountName", e.target.value)}
                            placeholder="e.g. Acme Australia Pty Ltd"
                            className={!acc.accountName.trim() ? "border-rose-500/50" : ""}
                          />
                        </div>
                        <div>
                          <Label className="text-[11.5px]">Account Code</Label>
                          <Input
                            value={acc.accountCode}
                            onChange={(e) => updateAccountField(idx, "accountCode", e.target.value)}
                            placeholder="ACC-001"
                          />
                        </div>
                        <div>
                          <Label className="text-[11.5px]">Legal Entity Structure</Label>
                          <Input
                            value={acc.accountLegalStructure}
                            onChange={(e) => updateAccountField(idx, "accountLegalStructure", e.target.value)}
                            placeholder="Pty Ltd / LLC / Inc"
                          />
                        </div>
                        <div>
                          <Label className="text-[11.5px]">Billing Entity</Label>
                          <Select
                            value={acc.billingEntity || form.billingEntity}
                            onValueChange={(v) => updateAccountField(idx, "billingEntity", v)}
                          >
                            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{billingEntities.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[11.5px]">Currency</Label>
                          <Select
                            value={acc.currency || form.currency}
                            onValueChange={(v) => updateAccountField(idx, "currency", v)}
                          >
                            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{clientCurrencies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[11.5px]">GST / Tax Registration Number</Label>
                          <Input
                            value={acc.taxRegistrationNumber}
                            onChange={(e) => updateAccountField(idx, "taxRegistrationNumber", e.target.value)}
                            placeholder="ABN / Tax ID"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-[11.5px]">Account Address Line 1</Label>
                          <Input
                            value={acc.addressLine1}
                            onChange={(e) => updateAccountField(idx, "addressLine1", e.target.value)}
                            placeholder="Street Address"
                          />
                        </div>
                        <div>
                          <Label className="text-[11.5px]">City</Label>
                          <Input
                            value={acc.city}
                            onChange={(e) => updateAccountField(idx, "city", e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-[11.5px]">State / Region</Label>
                          <Input
                            value={acc.stateOrRegion}
                            onChange={(e) => updateAccountField(idx, "stateOrRegion", e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-[11.5px]">Country</Label>
                          <Input
                            value={acc.country}
                            onChange={(e) => updateAccountField(idx, "country", e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-[11.5px]">Postal Code</Label>
                          <Input
                            value={acc.zipOrPinCode}
                            onChange={(e) => updateAccountField(idx, "zipOrPinCode", e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-[11.5px]">Industry</Label>
                          <Input
                            value={acc.industryCode}
                            onChange={(e) => updateAccountField(idx, "industryCode", e.target.value)}
                            placeholder="Software / Healthcare"
                          />
                        </div>
                        <div>
                          <Label className="text-[11.5px]">Sub Industry</Label>
                          <Input
                            value={acc.subIndustry}
                            onChange={(e) => updateAccountField(idx, "subIndustry", e.target.value)}
                            placeholder="SaaS / Cloud"
                          />
                        </div>
                        <div>
                          <Label className="text-[11.5px]">Business Unit Mapping</Label>
                          <Select
                            value={acc.businessUnitMapping || form.businessUnit}
                            onValueChange={(v) => updateAccountField(idx, "businessUnitMapping", v)}
                          >
                            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{businessUnits.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[11.5px]">Account Status</Label>
                          <Select
                            value={acc.accountStatus}
                            onValueChange={(v) => updateAccountField(idx, "accountStatus", v as "Active" | "Inactive")}
                          >
                            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Active">Active</SelectItem>
                              <SelectItem value="Inactive">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[11.5px]">Account Contact Name</Label>
                          <Input
                            value={acc.contactName}
                            onChange={(e) => updateAccountField(idx, "contactName", e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-[11.5px]">Account Contact Email</Label>
                          <Input
                            value={acc.contactEmail}
                            onChange={(e) => updateAccountField(idx, "contactEmail", e.target.value)}
                            placeholder="john@acme.com"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-[11.5px]">Delivery Location</Label>
                          <Input
                            value={acc.deliveryLocation}
                            onChange={(e) => updateAccountField(idx, "deliveryLocation", e.target.value)}
                            placeholder="Onsite / Remote / Offshore Office"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-[11.5px]">Account Notes</Label>
                          <Textarea
                            value={acc.notes}
                            onChange={(e) => updateAccountField(idx, "notes", e.target.value)}
                            rows={1}
                            placeholder="Special instructions or notes for this account entity..."
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                <Label>Scope Summary <span className="text-rose-500 font-bold">*</span></Label>
                <Textarea
                  value={form.scopeSummary}
                  onChange={(e) => setForm({ ...form, scopeSummary: e.target.value })}
                  rows={2}
                  placeholder="Full end-to-end bookkeeping, payroll, and monthly BAS lodgement…"
                  className={!form.scopeSummary.trim() ? "border-rose-500/50" : ""}
                />
              </div>
              <div className="col-span-2">
                <Label>Commercial & Escalation Notes</Label>
                <Textarea value={form.commercialNotes} onChange={(e) => setForm({ ...form, commercialNotes: e.target.value })} rows={2} />
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 flex items-center justify-between sm:justify-between w-full border-t border-border pt-3">
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              {!isFirstFormTab && (
                <Button variant="outline" onClick={goToPrevFormTab}>
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
                </Button>
              )}
              {!isLastFormTab && (
                <Button onClick={goToNextFormTab}>
                  Next <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              )}
              {isLastFormTab && (
                <Button
                  onClick={save}
                  disabled={saving || !!getFirstInvalidSection(form)}
                  className={getFirstInvalidSection(form) ? "opacity-60 cursor-not-allowed" : ""}
                >
                  {saving ? "Saving…" : "Save Record"}
                </Button>
              )}
            </div>
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
