import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Download,
  Plus,
  Search,
  SendHorizonal,
  UsersRound,
  Building2,
  MapPin,
  Phone,
  CreditCard,
  Laptop,
  ShieldCheck,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useAuth } from "@/lib/auth";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import {
  getAllCountries,
  getCountryByIso,
  getCountryByName,
  getStatesByCountry,
  getCitiesByState,
  validatePostalCode,
  parsePhoneNumber,
} from "@/lib/country-data";
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
  industryCodes,
  revenueBands,
  employeeSizeBands,
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
import { TeamOwnershipDialog } from "@/components/shared/TeamOwnershipDialog";
import {
  canCreateClient,
  canEditCompanyInfo,
  canSubmitClient,
  canAssignTeamLead,
  canManageDeliveryTeam,
} from "@/lib/client-visibility";

export const Route = createFileRoute("/clients")({
  head: () => ({
    meta: [
      { title: "Client Master · VNC Global" },
      {
        name: "description",
        content: "Client master data, contracts, software stack, and approval workflow.",
      },
    ],
  }),
  component: ClientsPage,
});

const ALL = "all";

type FormTab = "identity" | "address" | "billing" | "accounts" | "software" | "commercial";
const formTabOrder: FormTab[] = [
  "identity",
  "address",
  "billing",
  "accounts",
  "software",
  "commercial",
];

export type AccountFormItem = {
  accountName: string;
  accountCode: string;
  isPrimaryAccount: boolean;
  useCompanyAddress?: boolean;
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
    useCompanyAddress: isPrimary,
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
    billingEntity: "",
    currency: "",
    clientSupportLevel: clientSupportLevels[0],
    clientPhoneCountryCode: "+91",
    companyPhoneNumber: "",
    status: "Active" as "Active" | "On Hold" | "Non Active",
    // Section 2: Address
    clientAddressLine1: "",
    clientAddressLine2: "",
    clientCountry: "",
    clientCountryIso: "",
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
    // Section 6: Software Stack
    softwareStacks: softwareCategories.map((cat) => ({
      category: cat.name,
      selectedSoftware: [] as string[],
      loginUrls: [""] as string[],
      otherDetails: "",
    })),
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
    if (!f.clientPhoneCountryCode?.trim()) errors.push("Phone Country Code is required");
    if (!f.companyPhoneNumber.trim()) errors.push("Phone Number is required");
    if (f.status === "Non Active") {
      if (!f.nonActiveReason) errors.push("Reason for Non-Active Status is required");
      if (f.nonActiveReason === "Other" && !f.nonActiveOtherReasonText.trim()) {
        errors.push("Non-Active reason details are required");
      }
    }
  } else if (tab === "address") {
    if (!f.clientCountry.trim()) errors.push("Country is required");
    if (!f.clientStateOrRegion.trim()) errors.push("State / Province is required");
    if (!f.clientCity.trim()) errors.push("City is required");
    if (!f.clientZipOrPin.trim()) {
      errors.push("ZIP / Postal Code is required");
    } else {
      const zipVal = validatePostalCode(f.clientCountryIso || getCountryByName(f.clientCountry)?.isoCode, f.clientZipOrPin);
      if (!zipVal.valid && zipVal.error) {
        errors.push(zipVal.error);
      }
    }
    if (!f.clientAddressLine1.trim()) errors.push("Street Address is required");
  } else if (tab === "billing") {
    if (!f.contractType) errors.push("Contract Type is required");
    if (!f.billingFrequency) errors.push("Billing Frequency is required");
    if (!f.billingType) errors.push("Billing Type is required");
    if (!f.contractStart) errors.push("Contract Start Date is required");
    if (!f.billingStartDate) errors.push("Billing Start Date is required");
    if (
      f.contractStart &&
      f.billingStartDate &&
      new Date(f.billingStartDate) < new Date(f.contractStart)
    ) {
      errors.push("Billing Start Date must be on or after Contract Start Date");
    }
    if (!f.contractRenewalDate) errors.push("Contract Renewal Date is required");
  } else if (tab === "accounts") {
    if (!f.numberOfAccounts || f.numberOfAccounts < 1 || f.numberOfAccounts > 10) {
      errors.push("Number of Managed Accounts must be between 1 and 10");
    }
    if (!f.accounts || f.accounts.length !== f.numberOfAccounts) {
      errors.push(
        `Account count mismatch (${f.accounts?.length ?? 0} forms for ${f.numberOfAccounts} accounts)`,
      );
    } else {
      f.accounts.forEach((acc, i) => {
        if (!acc.accountName.trim()) errors.push(`Account #${i + 1} Name is required`);
        if (!acc.accountLegalStructure.trim())
          errors.push(`Account #${i + 1} Legal Entity Structure is required`);
        if (!acc.billingEntity || !acc.billingEntity.trim())
          errors.push(`Account #${i + 1} Billing Entity is required`);
        if (!acc.currency || !acc.currency.trim())
          errors.push(`Account #${i + 1} Currency is required`);

        const isInheriting = acc.isPrimaryAccount && (acc.useCompanyAddress ?? true);
        if (!isInheriting) {
          if (!acc.addressLine1.trim()) errors.push(`Account #${i + 1} Address Line 1 is required`);
          if (!acc.city.trim()) errors.push(`Account #${i + 1} City is required`);
          if (!acc.stateOrRegion.trim()) errors.push(`Account #${i + 1} State / Region is required`);
          if (!acc.country.trim()) errors.push(`Account #${i + 1} Country is required`);
          if (!acc.zipOrPinCode.trim()) errors.push(`Account #${i + 1} Postal Code is required`);
        }
        if (!acc.deliveryLocation.trim())
          errors.push(`Account #${i + 1} Delivery Location is required`);
        if (!acc.industryCode.trim()) errors.push(`Account #${i + 1} Industry Code is required`);
        if (!acc.revenueLast1Year.trim())
          errors.push(`Account #${i + 1} Revenue of Last 1 Year is required`);
        if (!acc.employeeSize.trim()) errors.push(`Account #${i + 1} Employee Size is required`);
      });
      const primaryCount = f.accounts.filter((a) => a.isPrimaryAccount).length;
      if (primaryCount !== 1) {
        errors.push("Exactly one account must be marked as Primary");
      }
    }
  } else if (tab === "software") {
    f.softwareStacks.forEach((stack) => {
      const hasSoftware =
        stack.selectedSoftware &&
        stack.selectedSoftware.length > 0 &&
        !stack.selectedSoftware.includes("NA");
      if (hasSoftware) {
        if (stack.selectedSoftware.includes("Other") && !stack.otherDetails.trim()) {
          errors.push(
            `${stack.category}: Please specify software details when 'Other' is selected`,
          );
        }
        const urls = stack.loginUrls.filter((u) => u.trim());
        if (urls.length === 0) {
          errors.push(`${stack.category}: At least one Login URL is required`);
        }
        urls.forEach((url) => {
          if (!url.startsWith("http://") && !url.startsWith("https://")) {
            errors.push(
              `${stack.category}: '${url}' is not a valid Login URL. It must start with http:// or https://`,
            );
          }
        });
      }
    });
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
    getClientSoftwareStacks,
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

  // Smart Address & International Phone datasets
  const allCountries = useMemo(() => getAllCountries(), []);

  const countryOptions = useMemo(() => {
    return allCountries.map((c) => ({
      value: c.name,
      label: c.name,
      flag: c.flag,
      badge: c.isoCode,
      searchKeywords: `${c.isoCode} ${c.phonecode} ${c.name}`,
    }));
  }, [allCountries]);

  const isdOptions = useMemo(() => {
    return allCountries
      .filter((c) => c.isdCode)
      .map((c) => ({
        value: c.isdCode,
        label: `${c.name} (${c.isdCode})`,
        flag: c.flag,
        badge: c.isdCode,
        searchKeywords: `${c.name} ${c.isdCode} ${c.isoCode}`,
      }));
  }, [allCountries]);

  const selectedCountryIso = useMemo(() => {
    if (form.clientCountryIso) return form.clientCountryIso;
    const match = getCountryByName(form.clientCountry);
    return match ? match.isoCode : "";
  }, [form.clientCountryIso, form.clientCountry]);

  const stateOptions = useMemo(() => {
    if (!selectedCountryIso) return [];
    const states = getStatesByCountry(selectedCountryIso);
    return states.map((s) => ({
      value: s.name,
      label: s.name,
      badge: s.isoCode,
    }));
  }, [selectedCountryIso]);

  const cityOptions = useMemo(() => {
    if (!selectedCountryIso || !form.clientStateOrRegion) return [];
    const cities = getCitiesByState(selectedCountryIso, form.clientStateOrRegion);
    return cities.map((c) => ({
      value: c.name,
      label: c.name,
    }));
  }, [selectedCountryIso, form.clientStateOrRegion]);

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
    const [existingAccounts, existingStacks] = await Promise.all([
      getClientAccounts(c.id),
      getClientSoftwareStacks(c.id),
    ]);
    const num = c.numberOfAccounts || (existingAccounts.length > 0 ? existingAccounts.length : 1);
    const loadedAccounts: AccountFormItem[] = [];

    for (let i = 0; i < num; i++) {
      const existing = existingAccounts[i];
      if (existing) {
        const isPrimary = existing.isPrimaryAccount ?? i === 0;
        const isMatchingCompanyAddr =
          !existing.addressLine1 ||
          !existing.country ||
          (existing.addressLine1.trim() === (c.clientAddressLine1 || "").trim() &&
            existing.country.trim() === (c.clientCountry || "").trim());

        loadedAccounts.push({
          accountName: existing.accountName ?? "",
          accountCode: existing.accountCode ?? "",
          isPrimaryAccount: isPrimary,
          useCompanyAddress: isPrimary ? isMatchingCompanyAddr : false,
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
        loadedAccounts.push(
          createEmptyAccount(i + 1, i === 0 && !loadedAccounts.some((a) => a.isPrimaryAccount)),
        );
      }
    }

    if (loadedAccounts.length > 0 && !loadedAccounts.some((a) => a.isPrimaryAccount)) {
      loadedAccounts[0].isPrimaryAccount = true;
    }

    const loadedStacks = softwareCategories.map((cat) => {
      const match = existingStacks.find((s: any) => s.category === cat.name);
      if (match) {
        return {
          category: cat.name,
          selectedSoftware:
            typeof match.selectedSoftware === "string"
              ? JSON.parse(match.selectedSoftware)
              : match.selectedSoftware || [],
          loginUrls:
            typeof match.loginUrls === "string"
              ? JSON.parse(match.loginUrls)
              : match.loginUrls || [""],
          otherDetails: match.otherDetails ?? "",
        };
      }
      return {
        category: cat.name,
        selectedSoftware: [] as string[],
        loginUrls: [""] as string[],
        otherDetails: "",
      };
    });

    const parsedCountryIso = c.clientCountryIso || getCountryByName(c.clientCountry)?.isoCode || "";
    const parsedPhone = parsePhoneNumber(c.companyPhoneNumber, parsedCountryIso);

    setForm({
      name: c.name,
      legalName: c.legalName ?? "",
      shortName: c.shortName ?? "",
      businessUnit: c.businessUnit ?? businessUnits[0],
      billingEntity: c.billingEntity ?? billingEntities[0],
      currency: c.currency ?? clientCurrencies[0],
      clientSupportLevel: c.clientSupportLevel ?? clientSupportLevels[0],
      clientPhoneCountryCode: c.clientPhoneCountryCode || parsedPhone.isdCode,
      companyPhoneNumber: parsedPhone.phoneNumber || c.companyPhoneNumber || "",
      status: (c.status as "Active" | "On Hold" | "Non Active") || "Active",
      clientAddressLine1: c.clientAddressLine1 ?? "",
      clientAddressLine2: c.clientAddressLine2 ?? "",
      clientCountry: c.clientCountry ?? "",
      clientCountryIso: parsedCountryIso,
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
      softwareStacks: loadedStacks,
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
    const preparedAccounts = (form.accounts || []).map((acc) => {
      if (acc.isPrimaryAccount && (acc.useCompanyAddress ?? true)) {
        return {
          ...acc,
          addressLine1: form.clientAddressLine1,
          addressLine2: form.clientAddressLine2,
          country: form.clientCountry,
          stateOrRegion: form.clientStateOrRegion,
          city: form.clientCity,
          zipOrPinCode: form.clientZipOrPin,
          contactPhone: `${form.clientPhoneCountryCode || ""} ${form.companyPhoneNumber || ""}`.trim(),
        };
      }
      return acc;
    });

    const payload = { ...form, accounts: preparedAccounts };

    const invalidSection = getFirstInvalidSection(payload);
    if (invalidSection) {
      setActiveFormTab(invalidSection.tab);
      toast.error(`Please complete mandatory details: ${invalidSection.error}`);
      return;
    }
    setSaving(true);
    const result = editing ? await updateClient(editing.id, payload) : await addClient(payload);
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(editing ? "Client record updated" : "Client created as Draft");
    setShowForm(false);
  }

  function handleNumAccountsChange(targetNum: number) {
    const currentNum = form.numberOfAccounts;
    if (targetNum === currentNum) return;

    if (targetNum < currentNum) {
      const confirmRemove = window.confirm(
        `Reducing account count from ${currentNum} to ${targetNum} will remove Account #${targetNum + 1} to #${currentNum} and any details entered. Do you want to proceed?`,
      );
      if (!confirmRemove) return;
    }

    const newAccounts: AccountFormItem[] = [];
    for (let i = 0; i < targetNum; i++) {
      if (form.accounts && form.accounts[i]) {
        newAccounts.push(form.accounts[i]);
      } else {
        newAccounts.push(
          createEmptyAccount(i + 1, i === 0 && !newAccounts.some((a) => a.isPrimaryAccount)),
        );
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
    value: AccountFormItem[K],
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
                      {c.legalName && (
                        <div className="text-xs text-muted-foreground">{c.legalName}</div>
                      )}
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
                      {c.recordStatus === "Sent Back for Correction" &&
                        c.rejectionCorrectionNotes && (
                          <p className="text-[11px] text-amber-700 mt-1 flex items-start gap-1 max-w-[220px] leading-snug">
                            <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                            <span>{c.rejectionCorrectionNotes}</span>
                          </p>
                        )}
                    </TableCell>
                    <TableCell className="text-right space-x-1 whitespace-nowrap">
                      {canEditCompanyInfo(user, c) && (
                        <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                          Edit
                        </Button>
                      )}
                      {canSubmitClient(user, c) &&
                      (c.recordStatus === "Draft" ||
                        c.recordStatus === "Sent Back for Correction") ? (
                        <Button variant="ghost" size="sm" onClick={() => submit(c)}>
                          <SendHorizonal className="h-3.5 w-3.5" /> Submit
                        </Button>
                      ) : null}
                      {canAssignTeamLead(user, c) &&
                      !c.teamLeadId &&
                      c.recordStatus === "Approved" ? (
                        <Button variant="ghost" size="sm" onClick={() => setOwnershipClient(c)}>
                          <UsersRound className="h-3.5 w-3.5" /> Assign Team Lead
                        </Button>
                      ) : null}
                      {canManageDeliveryTeam(user, c) && c.recordStatus === "Approved" ? (
                        <Button variant="ghost" size="sm" onClick={() => setOwnershipClient(c)}>
                          <UsersRound className="h-3.5 w-3.5" /> Manage Team
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
                <DialogTitle>
                  {editing
                    ? `Edit Client (${editing.code ?? "Draft"})`
                    : "New Client Master Record"}
                </DialogTitle>
                <DialogDescription className="mt-0.5">
                  Client Master Spec v1.0 — Fill in all mandatory details section by section.
                </DialogDescription>
              </div>
              <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-accent/10 text-accent shrink-0">
                Step {activeFormTabIndex + 1} of {formTabOrder.length}
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
              { id: "software" as FormTab, label: "5. Software Stack", icon: Laptop },
              { id: "commercial" as FormTab, label: "6. Commercial & Notes", icon: ShieldCheck },
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
                    <CheckCircle2
                      className={`h-3.5 w-3.5 ${isActive ? "text-background" : "text-emerald-500"}`}
                    />
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
                Please fill in required fields in this section:{" "}
                <strong>{getSectionErrors(activeFormTab, form)[0]}</strong>
              </span>
            </div>
          )}

          {/* Section 1: Identity */}
          {activeFormTab === "identity" && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="col-span-2">
                <Label>
                  Client Display Name <span className="text-rose-500 font-bold">*</span>
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Acme Corp"
                  className={!form.name.trim() ? "border-rose-500/50" : ""}
                />
                {form.name.trim() &&
                  clients.some(
                    (c) =>
                      c.name.trim().toLowerCase() === form.name.trim().toLowerCase() &&
                      c.id !== editing?.id,
                  ) && (
                    <p className="text-amber-600 text-[11px] font-semibold mt-1 flex items-center gap-1">
                      <span>⚠️ A client with this name already exists in the database.</span>
                    </p>
                  )}
              </div>
              <div className="col-span-2">
                <Label>
                  Legal Registered Name <span className="text-rose-500 font-bold">*</span>
                </Label>
                <Input
                  value={form.legalName}
                  onChange={(e) => setForm({ ...form, legalName: e.target.value })}
                  placeholder="Acme International Ltd"
                  className={!form.legalName.trim() ? "border-rose-500/50" : ""}
                />
              </div>
              <div>
                <Label>Short Name / Abbreviation</Label>
                <Input
                  value={form.shortName}
                  onChange={(e) => setForm({ ...form, shortName: e.target.value })}
                  placeholder="ACME"
                />
              </div>
              <div>
                <Label>
                  Client Status <span className="text-rose-500 font-bold">*</span>
                </Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {clientStatuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {form.status === "Non Active" && (
                <div className="col-span-2 p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-2">
                  <Label className="text-rose-600 font-medium">
                    Reason for Non-Active Status <span className="text-rose-500 font-bold">*</span>
                  </Label>
                  <Select
                    value={form.nonActiveReason}
                    onValueChange={(v) => setForm({ ...form, nonActiveReason: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {nonActiveClientReasons.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.nonActiveReason === "Other" && (
                    <Input
                      placeholder="Specify non-active reason details…"
                      value={form.nonActiveOtherReasonText}
                      onChange={(e) =>
                        setForm({ ...form, nonActiveOtherReasonText: e.target.value })
                      }
                      className={!form.nonActiveOtherReasonText.trim() ? "border-rose-500/50" : ""}
                    />
                  )}
                </div>
              )}

              <div>
                <Label>
                  Primary Business Unit <span className="text-rose-500 font-bold">*</span>
                </Label>
                <Select
                  value={form.businessUnit}
                  onValueChange={(v) => setForm({ ...form, businessUnit: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {businessUnits.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>
                  Billing Entity <span className="text-rose-500 font-bold">*</span>
                </Label>
                <Select
                  value={form.billingEntity}
                  onValueChange={(v) => setForm({ ...form, billingEntity: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {billingEntities.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>
                  Invoice Currency <span className="text-rose-500 font-bold">*</span>
                </Label>
                <Select
                  value={form.currency}
                  onValueChange={(v) => setForm({ ...form, currency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {clientCurrencies.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>
                  Client Support Level <span className="text-rose-500 font-bold">*</span>
                </Label>
                <Select
                  value={form.clientSupportLevel}
                  onValueChange={(v) => setForm({ ...form, clientSupportLevel: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {clientSupportLevels.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>
                  Company Phone Number <span className="text-rose-500 font-bold">*</span>
                </Label>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-[190px] shrink-0">
                    <SearchableSelect
                      options={isdOptions}
                      value={form.clientPhoneCountryCode || "+91"}
                      onChange={(val, opt) => {
                        setForm({ ...form, clientPhoneCountryCode: val });
                      }}
                      placeholder="ISD Code"
                      searchPlaceholder="Search country or code…"
                    />
                  </div>
                  <Input
                    value={form.companyPhoneNumber}
                    onChange={(e) => setForm({ ...form, companyPhoneNumber: e.target.value })}
                    placeholder="9876543210"
                    className={!form.companyPhoneNumber.trim() ? "border-rose-500/50" : ""}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Address */}
          {activeFormTab === "address" && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              {/* 1. Country */}
              <div className="col-span-2 sm:col-span-1">
                <Label>
                  Country <span className="text-rose-500 font-bold">*</span>
                </Label>
                <SearchableSelect
                  options={countryOptions}
                  value={form.clientCountry}
                  onChange={(val, opt) => {
                    const countryIso = opt?.badge || getCountryByName(val)?.isoCode || "";
                    const countryObj = getCountryByIso(countryIso);
                    setForm({
                      ...form,
                      clientCountry: val,
                      clientCountryIso: countryIso,
                      clientStateOrRegion: "",
                      clientCity: "",
                      clientPhoneCountryCode: countryObj ? countryObj.isdCode : form.clientPhoneCountryCode,
                    });
                  }}
                  placeholder="Select Country…"
                  searchPlaceholder="Search 250+ countries…"
                />
              </div>

              {/* 2. State / Province */}
              <div className="col-span-2 sm:col-span-1">
                <Label>
                  State / Province <span className="text-rose-500 font-bold">*</span>
                </Label>
                <SearchableSelect
                  options={stateOptions}
                  value={form.clientStateOrRegion}
                  disabled={!form.clientCountry}
                  onChange={(val) => {
                    setForm({
                      ...form,
                      clientStateOrRegion: val,
                      clientCity: "",
                    });
                  }}
                  placeholder={
                    !form.clientCountry ? "Select Country first" : "Select State / Province…"
                  }
                  searchPlaceholder="Search states…"
                  allowCustom={true}
                />
              </div>

              {/* 3. City */}
              <div className="col-span-2 sm:col-span-1">
                <Label>
                  City <span className="text-rose-500 font-bold">*</span>
                </Label>
                <SearchableSelect
                  options={cityOptions}
                  value={form.clientCity}
                  disabled={!form.clientStateOrRegion}
                  onChange={(val) => {
                    setForm({ ...form, clientCity: val });
                  }}
                  placeholder={
                    !form.clientStateOrRegion ? "Select State first" : "Select or type City…"
                  }
                  searchPlaceholder="Search cities or type custom…"
                  allowCustom={true}
                />
              </div>

              {/* 4. ZIP / Postal Code */}
              <div className="col-span-2 sm:col-span-1">
                <Label>
                  ZIP / Postal Code <span className="text-rose-500 font-bold">*</span>
                </Label>
                <Input
                  value={form.clientZipOrPin}
                  onChange={(e) => setForm({ ...form, clientZipOrPin: e.target.value })}
                  placeholder="e.g. 380001 or 90210"
                  className={!form.clientZipOrPin.trim() ? "border-rose-500/50" : ""}
                />
              </div>

              {/* 5. Street Address */}
              <div className="col-span-2">
                <Label>
                  Street Address <span className="text-rose-500 font-bold">*</span>
                </Label>
                <Textarea
                  value={form.clientAddressLine1}
                  onChange={(e) => setForm({ ...form, clientAddressLine1: e.target.value })}
                  placeholder="Suite 400, 100 Main St, Industrial Area"
                  rows={2}
                  className={!form.clientAddressLine1.trim() ? "border-rose-500/50" : ""}
                />
              </div>
              <div className="col-span-2">
                <Label className="text-muted-foreground text-[11px]">
                  Street Address Line 2 (Optional)
                </Label>
                <Input
                  value={form.clientAddressLine2}
                  onChange={(e) => setForm({ ...form, clientAddressLine2: e.target.value })}
                  placeholder="Building / Landmark / Floor"
                />
              </div>
            </div>
          )}

          {/* Section 4: Billing & Contract */}
          {activeFormTab === "billing" && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <Label>
                  Contract Type <span className="text-rose-500 font-bold">*</span>
                </Label>
                <Select
                  value={form.contractType}
                  onValueChange={(v) => setForm({ ...form, contractType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {contractTypes.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>
                  Billing Frequency <span className="text-rose-500 font-bold">*</span>
                </Label>
                <Select
                  value={form.billingFrequency}
                  onValueChange={(v) => setForm({ ...form, billingFrequency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {billingFrequencies.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>
                  Billing Type <span className="text-rose-500 font-bold">*</span>
                </Label>
                <Select
                  value={form.billingType}
                  onValueChange={(v) => setForm({ ...form, billingType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {billingTypes.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>
                  Contract Start Date <span className="text-rose-500 font-bold">*</span>
                </Label>
                <Input
                  type="date"
                  value={form.contractStart}
                  onChange={(e) => setForm({ ...form, contractStart: e.target.value })}
                  className={!form.contractStart ? "border-rose-500/50" : ""}
                />
              </div>
              <div>
                <Label>
                  Billing Start Date <span className="text-rose-500 font-bold">*</span>
                </Label>
                <Input
                  type="date"
                  value={form.billingStartDate}
                  onChange={(e) => setForm({ ...form, billingStartDate: e.target.value })}
                  className={!form.billingStartDate ? "border-rose-500/50" : ""}
                />
              </div>
              <div>
                <Label>
                  Contract Renewal Date <span className="text-rose-500 font-bold">*</span>
                </Label>
                <Input
                  type="date"
                  value={form.contractRenewalDate}
                  onChange={(e) => setForm({ ...form, contractRenewalDate: e.target.value })}
                  className={!form.contractRenewalDate ? "border-rose-500/50" : ""}
                />
              </div>
              <div className="col-span-2">
                <Label>Payment Terms</Label>
                <Input
                  value={form.paymentTerms}
                  onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                  placeholder="Net 30 days"
                />
              </div>
              <div className="col-span-2">
                <Label>Billing Notes & Special Instructions</Label>
                <Textarea
                  value={form.billingNotes}
                  onChange={(e) => setForm({ ...form, billingNotes: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Section 5: Accounts & Structure */}
          {activeFormTab === "accounts" && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border bg-surface-2">
                <div>
                  <Label className="text-xs font-semibold">
                    Number of Managed Accounts (1–10){" "}
                    <span className="text-rose-500 font-bold">*</span>
                  </Label>
                  <p className="text-[11.5px] text-muted-foreground mt-0.5">
                    Dynamically generates detailed account forms for each managed entity.
                  </p>
                </div>
                <Select
                  value={String(form.numberOfAccounts)}
                  onValueChange={(v) => handleNumAccountsChange(Number(v))}
                >
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} Account(s)
                      </SelectItem>
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
                          <Label
                            htmlFor={`account-primary-${idx}`}
                            className="font-semibold text-sm cursor-pointer flex items-center gap-1.5"
                          >
                            Account #{idx + 1}:{" "}
                            {acc.accountName.trim() || (
                              <span className="text-muted-foreground italic">Untitled Account</span>
                            )}
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
                          <Label className="text-[11.5px]">
                            Account Name <span className="text-rose-500 font-bold">*</span>
                          </Label>
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
                          <Label className="text-[11.5px]">
                            Legal Entity Structure{" "}
                            <span className="text-rose-500 font-bold">*</span>
                          </Label>
                          <Input
                            value={acc.accountLegalStructure}
                            onChange={(e) =>
                              updateAccountField(idx, "accountLegalStructure", e.target.value)
                            }
                            placeholder="Pty Ltd / LLC / Inc"
                            className={
                              !acc.accountLegalStructure.trim() ? "border-rose-500/50" : ""
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-[11.5px]">
                            Billing Entity <span className="text-rose-500 font-bold">*</span>
                          </Label>
                          <Select
                            value={acc.billingEntity}
                            onValueChange={(v) => updateAccountField(idx, "billingEntity", v)}
                          >
                            <SelectTrigger
                              className={`h-9 text-xs transition-colors hover:border-accent/40 ${
                                !acc.billingEntity.trim() ? "border-rose-500/50" : ""
                              }`}
                            >
                              <SelectValue placeholder="Select Billing Entity…" />
                            </SelectTrigger>
                            <SelectContent>
                              {billingEntities.map((b) => (
                                <SelectItem key={b} value={b}>
                                  {b}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[11.5px]">
                            Currency <span className="text-rose-500 font-bold">*</span>
                          </Label>
                          <Select
                            value={acc.currency}
                            onValueChange={(v) => updateAccountField(idx, "currency", v)}
                          >
                            <SelectTrigger
                              className={`h-9 text-xs transition-colors hover:border-accent/40 ${
                                !acc.currency.trim() ? "border-rose-500/50" : ""
                              }`}
                            >
                              <SelectValue placeholder="Select Currency…" />
                            </SelectTrigger>
                            <SelectContent>
                              {clientCurrencies.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[11.5px]">Tax / Registration Number</Label>
                          <Input
                            value={acc.taxRegistrationNumber}
                            onChange={(e) =>
                              updateAccountField(idx, "taxRegistrationNumber", e.target.value)
                            }
                            placeholder="ABN / Tax ID / PAN / GST"
                            className="hover:border-accent/40 transition-colors"
                          />
                        </div>

                        {/* Address Section */}
                        {acc.isPrimaryAccount ? (
                          <div className="col-span-2 p-3.5 rounded-xl border border-accent/20 bg-accent/5 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-xs font-semibold text-accent">
                                <CheckCircle2 className="h-4 w-4 shrink-0" />
                                <span>Using Company Address & Phone Information</span>
                              </div>
                              <label className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer select-none font-medium">
                                <input
                                  type="checkbox"
                                  checked={!acc.useCompanyAddress}
                                  onChange={(e) =>
                                    updateAccountField(idx, "useCompanyAddress", !e.target.checked)
                                  }
                                  className="h-3.5 w-3.5 rounded border-border accent-accent cursor-pointer"
                                />
                                <span>Use Different Address</span>
                              </label>
                            </div>
                            {(acc.useCompanyAddress ?? true) && (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11.5px] text-muted-foreground pt-1 border-t border-accent/10">
                                <div>
                                  Country:{" "}
                                  <strong className="text-foreground">
                                    {form.clientCountry || "—"}
                                  </strong>
                                </div>
                                <div>
                                  State:{" "}
                                  <strong className="text-foreground">
                                    {form.clientStateOrRegion || "—"}
                                  </strong>
                                </div>
                                <div>
                                  City:{" "}
                                  <strong className="text-foreground">
                                    {form.clientCity || "—"}
                                  </strong>
                                </div>
                                <div>
                                  ZIP:{" "}
                                  <strong className="text-foreground">
                                    {form.clientZipOrPin || "—"}
                                  </strong>
                                </div>
                                <div className="col-span-2 sm:col-span-4">
                                  Street:{" "}
                                  <strong className="text-foreground">
                                    {form.clientAddressLine1 || "—"}
                                  </strong>
                                </div>
                                <div className="col-span-2 sm:col-span-4">
                                  Phone:{" "}
                                  <strong className="text-foreground">
                                    {form.clientPhoneCountryCode} {form.companyPhoneNumber || "—"}
                                  </strong>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : null}

                        {(!acc.isPrimaryAccount || !acc.useCompanyAddress) && (
                          <>
                            <div className="col-span-2">
                              <Label className="text-[11.5px]">
                                Account Address Line 1{" "}
                                <span className="text-rose-500 font-bold">*</span>
                              </Label>
                              <Input
                                value={acc.addressLine1}
                                onChange={(e) =>
                                  updateAccountField(idx, "addressLine1", e.target.value)
                                }
                                placeholder="Street Address"
                                className={`hover:border-accent/40 transition-colors ${
                                  !acc.addressLine1.trim() ? "border-rose-500/50" : ""
                                }`}
                              />
                            </div>
                            <div>
                              <Label className="text-[11.5px]">
                                City <span className="text-rose-500 font-bold">*</span>
                              </Label>
                              <Input
                                value={acc.city}
                                onChange={(e) => updateAccountField(idx, "city", e.target.value)}
                                className={`hover:border-accent/40 transition-colors ${
                                  !acc.city.trim() ? "border-rose-500/50" : ""
                                }`}
                              />
                            </div>
                            <div>
                              <Label className="text-[11.5px]">
                                State / Region <span className="text-rose-500 font-bold">*</span>
                              </Label>
                              <Input
                                value={acc.stateOrRegion}
                                onChange={(e) =>
                                  updateAccountField(idx, "stateOrRegion", e.target.value)
                                }
                                className={`hover:border-accent/40 transition-colors ${
                                  !acc.stateOrRegion.trim() ? "border-rose-500/50" : ""
                                }`}
                              />
                            </div>
                            <div>
                              <Label className="text-[11.5px]">
                                Country <span className="text-rose-500 font-bold">*</span>
                              </Label>
                              <Input
                                value={acc.country}
                                onChange={(e) => updateAccountField(idx, "country", e.target.value)}
                                className={`hover:border-accent/40 transition-colors ${
                                  !acc.country.trim() ? "border-rose-500/50" : ""
                                }`}
                              />
                            </div>
                            <div>
                              <Label className="text-[11.5px]">
                                Postal Code <span className="text-rose-500 font-bold">*</span>
                              </Label>
                              <Input
                                value={acc.zipOrPinCode}
                                onChange={(e) =>
                                  updateAccountField(idx, "zipOrPinCode", e.target.value)
                                }
                                className={`hover:border-accent/40 transition-colors ${
                                  !acc.zipOrPinCode.trim() ? "border-rose-500/50" : ""
                                }`}
                              />
                            </div>
                          </>
                        )}
                        <div>
                          <Label className="text-[11.5px]">
                            Industry Code <span className="text-rose-500 font-bold">*</span>
                          </Label>
                          <Select
                            value={acc.industryCode}
                            onValueChange={(v) => updateAccountField(idx, "industryCode", v)}
                          >
                            <SelectTrigger
                              className={`h-9 text-xs ${!acc.industryCode.trim() ? "border-rose-500/50" : ""}`}
                            >
                              <SelectValue placeholder="Select industry" />
                            </SelectTrigger>
                            <SelectContent>
                              {industryCodes.map((code) => (
                                <SelectItem key={code} value={code}>
                                  {code}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                          <Label className="text-[11.5px]">
                            Revenue of Last 1 Year{" "}
                            <span className="text-rose-500 font-bold">*</span>
                          </Label>
                          <Select
                            value={acc.revenueLast1Year}
                            onValueChange={(v) => updateAccountField(idx, "revenueLast1Year", v)}
                          >
                            <SelectTrigger
                              className={`h-9 text-xs ${!acc.revenueLast1Year.trim() ? "border-rose-500/50" : ""}`}
                            >
                              <SelectValue placeholder="Select revenue band" />
                            </SelectTrigger>
                            <SelectContent>
                              {revenueBands.map((band) => (
                                <SelectItem key={band} value={band}>
                                  {band}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[11.5px]">
                            Employee Size <span className="text-rose-500 font-bold">*</span>
                          </Label>
                          <Select
                            value={acc.employeeSize}
                            onValueChange={(v) => updateAccountField(idx, "employeeSize", v)}
                          >
                            <SelectTrigger
                              className={`h-9 text-xs ${!acc.employeeSize.trim() ? "border-rose-500/50" : ""}`}
                            >
                              <SelectValue placeholder="Select employee size" />
                            </SelectTrigger>
                            <SelectContent>
                              {employeeSizeBands.map((band) => (
                                <SelectItem key={band} value={band}>
                                  {band}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[11.5px]">Business Unit Mapping</Label>
                          <Select
                            value={acc.businessUnitMapping || form.businessUnit}
                            onValueChange={(v) => updateAccountField(idx, "businessUnitMapping", v)}
                          >
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {businessUnits.map((b) => (
                                <SelectItem key={b} value={b}>
                                  {b}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[11.5px]">Account Status</Label>
                          <Select
                            value={acc.accountStatus}
                            onValueChange={(v) =>
                              updateAccountField(idx, "accountStatus", v as "Active" | "Inactive")
                            }
                          >
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue />
                            </SelectTrigger>
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
                            onChange={(e) =>
                              updateAccountField(idx, "contactEmail", e.target.value)
                            }
                            placeholder="john@acme.com"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-[11.5px]">
                            Delivery Location <span className="text-rose-500 font-bold">*</span>
                          </Label>
                          <Input
                            value={acc.deliveryLocation}
                            onChange={(e) =>
                              updateAccountField(idx, "deliveryLocation", e.target.value)
                            }
                            placeholder="Onsite / Remote / Offshore Office"
                            className={!acc.deliveryLocation.trim() ? "border-rose-500/50" : ""}
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

          {/* Section 6: Software Stack */}
          {activeFormTab === "software" && (
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-surface-2 rounded-xl border border-border text-xs">
                <h4 className="font-semibold flex items-center gap-1.5 text-foreground mb-1">
                  <Laptop className="h-4 w-4 text-accent" /> Client Software Stack Configuration
                </h4>
                <p className="text-muted-foreground leading-relaxed">
                  Configure the primary application tools used for accounting, payroll, and
                  workflows. If a category is marked "NA", Login URLs are not required. If "Other"
                  is selected, details are mandatory.
                </p>
              </div>

              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                {form.softwareStacks.map((stack, idx) => {
                  const hasSelection = stack.selectedSoftware.length > 0;
                  const isNA = stack.selectedSoftware.includes("NA");
                  const isOtherSelected = stack.selectedSoftware.includes("Other");

                  // Handle software selection checkbox toggle
                  const handleSoftwareToggle = (softwareName: string) => {
                    let updatedSelected = [...stack.selectedSoftware];
                    if (softwareName === "NA") {
                      // If NA is selected, clear everything else and just keep NA
                      updatedSelected = ["NA"];
                    } else {
                      // If any other software is selected, remove NA
                      updatedSelected = updatedSelected.filter((s) => s !== "NA");
                      if (updatedSelected.includes(softwareName)) {
                        updatedSelected = updatedSelected.filter((s) => s !== softwareName);
                      } else {
                        updatedSelected.push(softwareName);
                      }
                    }

                    const updatedStacks = [...form.softwareStacks];
                    updatedStacks[idx] = {
                      ...stack,
                      selectedSoftware: updatedSelected,
                      // Clear details if Other is toggled off
                      otherDetails: updatedSelected.includes("Other") ? stack.otherDetails : "",
                    };
                    setForm({ ...form, softwareStacks: updatedStacks });
                  };

                  // Handle URL input changes
                  const handleUrlChange = (urlIdx: number, val: string) => {
                    const updatedUrls = [...stack.loginUrls];
                    updatedUrls[urlIdx] = val;
                    const updatedStacks = [...form.softwareStacks];
                    updatedStacks[idx] = { ...stack, loginUrls: updatedUrls };
                    setForm({ ...form, softwareStacks: updatedStacks });
                  };

                  const addUrlField = () => {
                    const updatedStacks = [...form.softwareStacks];
                    updatedStacks[idx] = { ...stack, loginUrls: [...stack.loginUrls, ""] };
                    setForm({ ...form, softwareStacks: updatedStacks });
                  };

                  const removeUrlField = (urlIdx: number) => {
                    const updatedUrls = stack.loginUrls.filter((_, i) => i !== urlIdx);
                    const updatedStacks = [...form.softwareStacks];
                    updatedStacks[idx] = {
                      ...stack,
                      loginUrls: updatedUrls.length > 0 ? updatedUrls : [""],
                    };
                    setForm({ ...form, softwareStacks: updatedStacks });
                  };

                  const getOptions = (category: string) => {
                    if (category === "Accounting & General Ledger")
                      return ["Xero", "MYOB", "QuickBooks", "Other", "NA"];
                    if (category === "Payroll & Workforce")
                      return ["KeyPay", "Xero Payroll", "MYOB Payroll", "Deputy", "Other", "NA"];
                    if (category === "Accounts Payable (AP)")
                      return ["Hubdoc", "Dext", "Lightyear", "Other", "NA"];
                    if (category === "Billing & Accounts Receivable (AR)")
                      return ["Pinch", "Stripe", "GoCardless", "Other", "NA"];
                    return ["Other", "NA"];
                  };

                  return (
                    <div
                      key={stack.category}
                      className={`rounded-2xl border p-4 space-y-3 bg-card ${
                        isNA ? "border-border opacity-75" : "border-border shadow-sm"
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-border/60 pb-2">
                        <Label className="font-semibold text-sm">{stack.category}</Label>
                        {isNA && (
                          <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground">
                            Not Applicable
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-3 pt-1">
                        {getOptions(stack.category).map((opt) => {
                          const isChecked = stack.selectedSoftware.includes(opt);
                          return (
                            <label
                              key={opt}
                              className="flex items-center gap-2 text-xs cursor-pointer select-none"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleSoftwareToggle(opt)}
                                className="rounded border-border text-accent accent-accent cursor-pointer h-3.5 w-3.5"
                              />
                              <span
                                className={
                                  isChecked
                                    ? "font-semibold text-foreground"
                                    : "text-muted-foreground"
                                }
                              >
                                {opt}
                              </span>
                            </label>
                          );
                        })}
                      </div>

                      {/* Other Details input */}
                      {isOtherSelected && (
                        <div className="space-y-1 pt-1">
                          <Label className="text-[11px] text-rose-600 font-semibold">
                            Other Software Specification *
                          </Label>
                          <Input
                            placeholder="Please specify software name and details..."
                            value={stack.otherDetails}
                            onChange={(e) => {
                              const updatedStacks = [...form.softwareStacks];
                              updatedStacks[idx] = { ...stack, otherDetails: e.target.value };
                              setForm({ ...form, softwareStacks: updatedStacks });
                            }}
                            className={!stack.otherDetails.trim() ? "border-rose-500/50" : ""}
                          />
                        </div>
                      )}

                      {/* Login URLs input (hidden if NA or empty selection) */}
                      {hasSelection && !isNA && (
                        <div className="space-y-2 pt-1">
                          <Label className="text-[11px] font-semibold flex items-center justify-between">
                            <span>
                              Login URLs <span className="text-rose-500 font-bold">*</span>
                            </span>
                            <button
                              type="button"
                              onClick={addUrlField}
                              className="text-[10px] text-accent hover:underline font-normal cursor-pointer"
                            >
                              + Add Login URL
                            </button>
                          </Label>

                          <div className="space-y-1.5">
                            {stack.loginUrls.map((url, urlIdx) => {
                              const isInvalid =
                                url.trim() &&
                                !url.startsWith("http://") &&
                                !url.startsWith("https://");
                              return (
                                <div key={urlIdx} className="flex items-center gap-2">
                                  <Input
                                    placeholder="https://login.xero.com"
                                    value={url}
                                    onChange={(e) => handleUrlChange(urlIdx, e.target.value)}
                                    className={`h-8 text-xs ${isInvalid || (!url.trim() && urlIdx === 0) ? "border-rose-500/50" : ""}`}
                                  />
                                  {stack.loginUrls.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeUrlField(urlIdx)}
                                      className="text-xs text-rose-500 hover:text-rose-600 font-semibold px-2"
                                    >
                                      Remove
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
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
                <Input
                  value={form.applicableServiceCodes}
                  onChange={(e) => setForm({ ...form, applicableServiceCodes: e.target.value })}
                  placeholder="BK-01, TAX-02, EFA-RET"
                />
              </div>
              <div className="col-span-2">
                <Label>Contract Copy / Document Storage Link</Label>
                <Input
                  value={form.contractCopyLink}
                  onChange={(e) => setForm({ ...form, contractCopyLink: e.target.value })}
                  placeholder="https://drive.google.com/…"
                />
              </div>
              <div className="col-span-2">
                <Label>
                  Scope Summary <span className="text-rose-500 font-bold">*</span>
                </Label>
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
                <Textarea
                  value={form.commercialNotes}
                  onChange={(e) => setForm({ ...form, commercialNotes: e.target.value })}
                  rows={2}
                />
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
