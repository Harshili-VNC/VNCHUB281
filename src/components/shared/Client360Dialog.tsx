import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  Laptop,
  ShieldCheck,
  UsersRound,
  History,
  FileText,
  Clock,
  Lock,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  X,
  Pencil,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useAuth } from "@/lib/auth";
import { useWorkspace, type ClientRecord, type ClientAccount } from "@/lib/workspace";
import { canViewSensitiveClientData, canEditCompanyInfo } from "@/lib/client-visibility";
import { getCountryByName, parsePhoneNumber } from "@/lib/country-data";
import { Button } from "@/components/ui/button";

interface Client360DialogProps {
  client: ClientRecord | null;
  open: boolean;
  onClose: () => void;
}

type TabKey =
  | "overview"
  | "contacts"
  | "accounts"
  | "software"
  | "team"
  | "commercial"
  | "timeline"
  | "documents";

export function Client360Dialog({ client, open, onClose }: Client360DialogProps) {
  const { user, people } = useAuth();
  const navigate = useNavigate();
  const { clientChangeRequests, getClientAccounts, getClientSoftwareStacks, getClientHistory } =
    useWorkspace();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [accounts, setAccounts] = useState<ClientAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [softwareStacks, setSoftwareStacks] = useState<any[]>([]);
  const [loadingSoftware, setLoadingSoftware] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (open && client) {
      if (activeTab === "accounts") {
        setLoadingAccounts(true);
        getClientAccounts(client.id)
          .then((res) => setAccounts(res))
          .catch(() => setAccounts([]))
          .finally(() => setLoadingAccounts(false));
      } else if (activeTab === "software") {
        setLoadingSoftware(true);
        getClientSoftwareStacks(client.id)
          .then((res) => setSoftwareStacks(res))
          .catch(() => setSoftwareStacks([]))
          .finally(() => setLoadingSoftware(false));
      } else if (activeTab === "timeline") {
        setLoadingHistory(true);
        getClientHistory(client.id)
          .then((res) => setHistory(res))
          .catch(() => setHistory([]))
          .finally(() => setLoadingHistory(false));
      }
    }
  }, [open, client, activeTab]);

  if (!client) return null;

  const canViewSensitive = canViewSensitiveClientData(user);

  // Find related team members
  const findPerson = (id?: string) => people.find((p) => p.id === id);

  const buManager = findPerson(client.businessUnitManagerId ?? undefined);
  const teamLead = findPerson(client.teamLeadId ?? undefined);
  const assistantLead = findPerson(client.assistantTeamLeadId ?? undefined);

  // Related change requests
  const relatedChangeRequests = clientChangeRequests.filter((cr) => cr.clientId === client.id);

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
                  {client.name}
                </DialogTitle>
                <StatusBadge status={client.status} />
                <StatusBadge status={client.recordStatus} />
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap pt-0.5">
                <span>
                  Code: <strong className="text-foreground">{client.code ?? "—"}</strong>
                </span>
                <span>•</span>
                <span>
                  BU:{" "}
                  <strong className="text-foreground">{client.businessUnit ?? "—"}</strong>
                </span>
                <span>•</span>
                <span>
                  Entity:{" "}
                  <strong className="text-foreground">{client.billingEntity ?? "—"}</strong>
                </span>
                <span>•</span>
                <span>
                  Support Level:{" "}
                  <strong className="text-accent font-medium">
                    {client.clientSupportLevel ?? "—"}
                  </strong>
                </span>
              </div>
            </div>
            {/* Edit option in Client360 — previously this popup had no edit
                capability at all, only the Client List's Actions column
                did. Reuses the exact same canEditCompanyInfo permission
                check as that button (currently: Finance Head or Marketing
                Head, only for records they created/last touched, only
                while Draft or Sent Back for Correction) — no permission
                scope was changed, this just exposes the existing
                capability in a second place. Navigates to the Client List
                route with ?edit=<id>, since the edit form's state lives
                locally in that route, not in this globally-rendered
                dialog. */}
            {canEditCompanyInfo(user, client) && (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => {
                  const id = client.id;
                  onClose();
                  navigate({ to: "/clients", search: { edit: id } });
                }}
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-border pb-2 overflow-x-auto text-xs">
          {[
            { id: "overview", label: "Overview & Address", icon: Building2 },
            { id: "contacts", label: "Contacts", icon: Phone },
            { id: "accounts", label: `Accounts (${client.numberOfAccounts ?? 1})`, icon: Laptop },
            { id: "software", label: "Software Stack", icon: CreditCard },
            { id: "team", label: "Assigned Team", icon: UsersRound },
            { id: "commercial", label: "Commercial & Billing", icon: ShieldCheck, sensitive: true },
            { id: "timeline", label: "Approval & Changes", icon: History },
            { id: "documents", label: "Docs & Notes", icon: FileText },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabKey)}
              className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-foreground text-background font-semibold"
                  : "text-muted-foreground hover:bg-surface-2"
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
              {tab.sensitive && !canViewSensitive && (
                <Lock className="h-3 w-3 text-amber-500 ml-0.5" />
              )}
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW & ADDRESS */}
        {activeTab === "overview" && (
          <div className="space-y-6 pt-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-2xl border border-border bg-surface-2/50 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Display Name</span>
                <span className="font-semibold text-foreground">{client.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">
                  Legal Registered Name
                </span>
                <span className="font-semibold text-foreground">{client.legalName || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Short Abbreviation</span>
                <span className="font-semibold text-foreground">{client.shortName || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">
                  Primary Business Unit
                </span>
                <span className="font-semibold text-foreground">{client.businessUnit || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Billing Entity</span>
                <span className="font-semibold text-foreground">{client.billingEntity || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Invoice Currency</span>
                <span className="font-semibold text-foreground">{client.currency || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Company Phone</span>
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  {client.companyPhoneNumber ? (
                    (() => {
                      const countryObj = getCountryByName(client.clientCountry);
                      const parsed = parsePhoneNumber(client.companyPhoneNumber, client.clientCountryIso || countryObj?.isoCode);
                      const flag = countryObj?.flag || "";
                      const isd = client.clientPhoneCountryCode || parsed.isdCode || "";
                      const num = parsed.phoneNumber || client.companyPhoneNumber;
                      return (
                        <>
                          {flag && <span className="text-sm">{flag}</span>}
                          {isd && <span>{isd}</span>}
                          <span>{num}</span>
                        </>
                      );
                    })()
                  ) : (
                    "—"
                  )}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Support Level</span>
                <span className="font-semibold text-foreground">
                  {client.clientSupportLevel || "—"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Record Status</span>
                <span className="font-semibold text-foreground">{client.recordStatus}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-border bg-surface-2/30 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-accent" /> Client Address
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Country</span>
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    {(() => {
                      const countryObj = getCountryByName(client.clientCountry);
                      return (
                        <>
                          {countryObj?.flag && <span className="text-sm">{countryObj.flag}</span>}
                          <span>{client.clientCountry || "—"}</span>
                          {(client.clientCountryIso || countryObj?.isoCode) && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ({client.clientCountryIso || countryObj?.isoCode})
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">State / Province</span>
                  <span className="font-medium">{client.clientStateOrRegion || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">City</span>
                  <span className="font-medium">{client.clientCity || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Zip / PIN Code</span>
                  <span className="font-medium">{client.clientZipOrPin || "—"}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground block text-[11px]">Street Address</span>
                  <span className="font-medium whitespace-pre-line">{client.clientAddressLine1 || "—"}</span>
                </div>
                {client.clientAddressLine2 && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground block text-[11px]">Street Address Line 2</span>
                    <span className="font-medium">{client.clientAddressLine2}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CONTACTS */}
        {activeTab === "contacts" && (
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-accent" /> Client Key Contacts
            </h4>
            <div className="p-4 rounded-2xl border border-border bg-elevated text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">{client.name} Main Contact</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold text-[10.5px]">
                  Primary Contact
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-muted-foreground pt-1">
                <div>
                  Phone:{" "}
                  <strong className="text-foreground">{client.companyPhoneNumber || "—"}</strong>
                </div>
                <div>
                  Location:{" "}
                  <strong className="text-foreground">
                    {client.clientCity ? `${client.clientCity}, ${client.clientCountry}` : "—"}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ACCOUNTS */}
        {activeTab === "accounts" && (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-2xl border border-border bg-surface-2 text-xs space-y-2">
              <div className="font-semibold text-foreground flex items-center gap-2">
                <Laptop className="h-4 w-4 text-accent" /> Managed Accounts Breakdown
              </div>
              <p className="text-muted-foreground">
                Configured with <strong>{client.numberOfAccounts ?? accounts.length ?? 1}</strong>{" "}
                managed account entity/entities under {client.name}.
              </p>
            </div>

            {loadingAccounts ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Loading accounts data…
              </div>
            ) : accounts.length === 0 ? (
              <div className="rounded-xl border border-border overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-surface-2 border-b border-border font-semibold text-muted-foreground">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Account / Entity Name</th>
                      <th className="p-3">Scope</th>
                      <th className="p-3">Primary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {Array.from({ length: client.numberOfAccounts ?? 1 }).map((_, i) => (
                      <tr key={i}>
                        <td className="p-3 text-muted-foreground font-medium">{i + 1}</td>
                        <td className="p-3 font-semibold">
                          {client.name} Entity {i + 1}
                        </td>
                        <td className="p-3">
                          <span className="text-emerald-500 font-medium">In Scope</span>
                        </td>
                        <td className="p-3">
                          {i === 0 ? (
                            <span className="text-accent font-semibold">Primary</span>
                          ) : (
                            "Secondary"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-surface-2 border-b border-border font-semibold text-muted-foreground">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Account Name & Code</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Legal / Billing Entity</th>
                      <th className="p-3">Location</th>
                      <th className="p-3">Tax / GST</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {accounts.map((acc, i) => (
                      <tr
                        key={acc.id || i}
                        className={acc.isPrimaryAccount ? "bg-accent/5 font-medium" : ""}
                      >
                        <td className="p-3 text-muted-foreground">{i + 1}</td>
                        <td className="p-3">
                          <div className="font-semibold text-foreground">{acc.accountName}</div>
                          {acc.accountCode && (
                            <div className="text-[11px] text-muted-foreground">
                              Code: {acc.accountCode}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          {acc.isPrimaryAccount ? (
                            <span className="px-2 py-0.5 rounded-full bg-accent/15 text-accent font-semibold text-[10.5px]">
                              Primary
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Secondary</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div>{acc.accountLegalStructure || "—"}</div>
                          {acc.billingEntity && (
                            <div className="text-[11px] text-muted-foreground">
                              Billing: {acc.billingEntity}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {acc.city || acc.country
                            ? `${acc.city || ""}${acc.city && acc.country ? ", " : ""}${acc.country || ""}`
                            : "—"}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {acc.taxRegistrationNumber || "—"}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${
                              acc.accountStatus === "Inactive"
                                ? "bg-rose-500/10 text-rose-600"
                                : "bg-emerald-500/10 text-emerald-600"
                            }`}
                          >
                            {acc.accountStatus || "Active"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SOFTWARE STACK */}
        {activeTab === "software" && (
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-accent" /> Client Software Ecosystem
            </h4>

            {loadingSoftware ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                Loading software stack details...
              </div>
            ) : softwareStacks.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-border bg-surface-2/40 text-center text-xs text-muted-foreground">
                No software stack configuration found for this client.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {softwareStacks.map((stack) => {
                  const selected =
                    typeof stack.selectedSoftware === "string"
                      ? JSON.parse(stack.selectedSoftware)
                      : stack.selectedSoftware || [];
                  const urls =
                    typeof stack.loginUrls === "string"
                      ? JSON.parse(stack.loginUrls)
                      : stack.loginUrls || [];
                  const hasSelection = selected.length > 0;
                  const isNA = selected.includes("NA");

                  return (
                    <div
                      key={stack.category}
                      className="p-4 rounded-2xl border border-border bg-card space-y-2"
                    >
                      <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
                        <span className="font-bold text-foreground text-[12px]">
                          {stack.category}
                        </span>
                        {isNA && (
                          <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                            NA
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[10px] block font-medium">
                          Selected Tools
                        </span>
                        <span className="font-semibold text-foreground">
                          {hasSelection ? selected.join(", ") : "None configured"}
                        </span>
                      </div>
                      {stack.otherDetails && (
                        <div>
                          <span className="text-muted-foreground text-[10px] block font-medium">
                            Other Details
                          </span>
                          <span className="text-foreground">{stack.otherDetails}</span>
                        </div>
                      )}
                      {urls.length > 0 && !isNA && (
                        <div>
                          <span className="text-muted-foreground text-[10px] block font-medium mb-0.5">
                            Login URLs
                          </span>
                          <div className="space-y-1">
                            {urls.map((url: string, uIdx: number) => (
                              <a
                                key={uIdx}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-accent hover:underline flex items-center gap-1 text-[11px] truncate font-medium"
                              >
                                {url} <ExternalLink className="h-3 w-3 shrink-0" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: ASSIGNED TEAM */}
        {activeTab === "team" && (
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <UsersRound className="h-3.5 w-3.5 text-accent" /> Delivery Team Structure
            </h4>

            {!client.teamLeadId ? (
              /* Case 1: Team Lead is not assigned */
              <div className="p-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-center space-y-2 text-xs">
                <AlertCircle className="h-6 w-6 text-amber-500 mx-auto" />
                <h4 className="font-semibold text-foreground text-sm">
                  Team Lead Assignment Pending
                </h4>
                <p className="text-muted-foreground font-medium max-w-md mx-auto">
                  Waiting for Business Unit Head to assign Team Lead.
                </p>
              </div>
            ) : !client.assistantTeamLeadId &&
              !client.businessUnitManagerId &&
              !client.financeAnalyst1Id ? (
              /* Case 2: Team Lead is assigned but team is empty */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-muted-foreground text-[11px] block font-medium">
                      Assigned Team Lead
                    </span>
                    <span className="font-bold text-foreground text-sm">
                      {teamLead ? teamLead.name : "Assigned"}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-600 font-semibold text-xs">
                    Team Lead Assigned
                  </span>
                </div>
                <div className="p-6 rounded-2xl border border-dashed border-border bg-surface-2/40 text-center space-y-2 text-xs">
                  <Clock className="h-6 w-6 text-accent mx-auto" />
                  <h4 className="font-semibold text-foreground text-sm">
                    Delivery Team Construction Pending
                  </h4>
                  <p className="text-muted-foreground font-medium max-w-md mx-auto">
                    Waiting for Team Lead to build the delivery team.
                  </p>
                </div>
              </div>
            ) : (
              /* Case 3: Complete delivery team is assigned */
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl border border-border bg-surface-2">
                  <span className="text-muted-foreground text-[11px] block">Team Lead</span>
                  <span className="font-semibold">{teamLead ? teamLead.name : "Unassigned"}</span>
                </div>
                <div className="p-3 rounded-xl border border-border bg-surface-2">
                  <span className="text-muted-foreground text-[11px] block">BU Manager</span>
                  <span className="font-semibold">{buManager ? buManager.name : "Unassigned"}</span>
                </div>
                <div className="p-3 rounded-xl border border-border bg-surface-2 col-span-2">
                  <span className="text-muted-foreground text-[11px] block">
                    Assistant Team Lead
                  </span>
                  <span className="font-semibold">
                    {assistantLead ? assistantLead.name : "Unassigned"}
                  </span>
                </div>
                {client.financeAnalyst1Id && (
                  <div className="p-3 rounded-xl border border-border bg-surface-2 col-span-2">
                    <span className="text-muted-foreground text-[11px] block">
                      Primary Finance Analyst
                    </span>
                    <span className="font-semibold">
                      {findPerson(client.financeAnalyst1Id)?.name ?? "Assigned"}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: COMMERCIAL & BILLING (SENSITIVE) */}
        {activeTab === "commercial" && (
          <div className="space-y-4 pt-2">
            {!canViewSensitive ? (
              <div className="p-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-center space-y-2 text-xs">
                <Lock className="h-6 w-6 text-amber-500 mx-auto" />
                <h4 className="font-semibold text-foreground text-sm">
                  Commercial Information Restricted
                </h4>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Contract details, billing frequencies, payment terms, and financial notes are
                  confidential and visible only to Executive Leadership (CEO, MD, Admin) and the
                  Business Unit Head.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl border border-border bg-surface-2 text-xs">
                  <div>
                    <span className="text-muted-foreground text-[11px] block">Contract Type</span>
                    <span className="font-semibold">{client.contractType || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[11px] block">
                      Billing Frequency
                    </span>
                    <span className="font-semibold">{client.billingFrequency || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[11px] block">Billing Type</span>
                    <span className="font-semibold">{client.billingType || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[11px] block">
                      Contract Start Date
                    </span>
                    <span className="font-semibold">{client.contractStart || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[11px] block">
                      Billing Start Date
                    </span>
                    <span className="font-semibold">{client.billingStartDate || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[11px] block">Renewal Date</span>
                    <span className="font-semibold">{client.contractRenewalDate || "—"}</span>
                  </div>
                  <div className="col-span-3">
                    <span className="text-muted-foreground text-[11px] block">Payment Terms</span>
                    <span className="font-semibold">{client.paymentTerms || "Net 30 days"}</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-border bg-surface-2 text-xs space-y-2">
                  <span className="text-muted-foreground text-[11px] block font-medium">
                    Scope Summary
                  </span>
                  <p className="font-normal text-foreground leading-relaxed">
                    {client.scopeSummary || "End-to-end accounting & reporting service."}
                  </p>
                </div>

                {client.billingNotes && (
                  <div className="p-4 rounded-2xl border border-border bg-surface-2 text-xs space-y-2">
                    <span className="text-muted-foreground text-[11px] block font-medium">
                      Billing & Escalation Notes
                    </span>
                    <p className="font-normal text-foreground">{client.billingNotes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 7: APPROVAL TIMELINE & CHANGES */}
        {activeTab === "timeline" && (
          <div className="space-y-6 pt-2 text-xs">
            <div className="p-4 rounded-2xl border border-border bg-surface-2 space-y-3">
              <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-accent" /> Client Approval Audit Trail
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-border pt-3">
                <div>
                  <span className="text-muted-foreground text-[11px] block">Created By</span>
                  <span className="font-semibold text-foreground">
                    {client.createdBy || "System Admin"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[11px] block">Created Date</span>
                  <span className="font-semibold text-foreground">
                    {client.createdAt || "2026-01-01"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[11px] block">Last Updated By</span>
                  <span className="font-semibold text-foreground">
                    {client.lastUpdatedBy || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[11px] block">Approved By</span>
                  <span className="font-semibold text-foreground">{client.approvedBy || "—"}</span>
                </div>
              </div>
            </div>

            {/* Chronological History Log Timeline */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                <History className="h-4 w-4 text-accent" /> Chronological Activity History
              </h4>
              {loadingHistory ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  Loading history logs...
                </div>
              ) : history.length === 0 ? (
                <div className="p-6 rounded-2xl border border-dashed border-border bg-surface-2/40 text-center text-xs text-muted-foreground">
                  No chronological history logs recorded yet.
                </div>
              ) : (
                <div className="relative pl-6 border-l-2 border-border ml-2 space-y-4 py-2">
                  {history.map((h, hIdx) => {
                    const changedByPerson = findPerson(h.changedBy);
                    const formattedDate = h.changedAt
                      ? new Date(h.changedAt).toLocaleString()
                      : "Unknown date";
                    return (
                      <div key={h.id || hIdx} className="relative">
                        {/* Timeline dot */}
                        <div className="absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 border-background bg-accent flex items-center justify-center">
                          <div className="h-1.5 w-1.5 rounded-full bg-background" />
                        </div>
                        <div className="bg-card p-3.5 rounded-xl border border-border space-y-1.5">
                          <div className="flex items-center justify-between gap-4 flex-wrap">
                            <span className="font-semibold text-foreground text-xs">
                              {h.action}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-medium">
                              {formattedDate}
                            </span>
                          </div>
                          {h.remarks && (
                            <p className="text-muted-foreground leading-relaxed text-[11px] bg-surface-2/50 px-2 py-1 rounded">
                              Remarks: {h.remarks}
                            </p>
                          )}
                          <div className="flex items-center gap-1 text-[10.5px] text-muted-foreground">
                            <span>Logged by:</span>
                            <span className="font-semibold text-foreground">
                              {changedByPerson
                                ? `${changedByPerson.name} (${changedByPerson.designation || changedByPerson.departmentFunction})`
                                : h.changedBy || "System"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {relatedChangeRequests.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground">Effective-Dated Change Requests</h4>
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-surface-2 font-semibold text-muted-foreground">
                      <tr>
                        <th className="p-2.5">Field</th>
                        <th className="p-2.5">New Value</th>
                        <th className="p-2.5">Effective From</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {relatedChangeRequests.map((cr) => (
                        <tr key={cr.id}>
                          <td className="p-2.5 font-medium">{cr.field}</td>
                          <td className="p-2.5">{cr.newValue}</td>
                          <td className="p-2.5">{cr.effectiveFrom}</td>
                          <td className="p-2.5">
                            <StatusBadge status={cr.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 8: DOCUMENTS & NOTES */}
        {activeTab === "documents" && (
          <div className="space-y-4 pt-2 text-xs">
            <div className="p-6 rounded-2xl border border-dashed border-border bg-surface-2/30 text-center space-y-2">
              <FileText className="h-8 w-8 text-muted-foreground mx-auto" />
              <h4 className="font-semibold text-foreground">Client Document Repository</h4>
              <p className="text-muted-foreground max-w-sm mx-auto">
                No custom contracts or attachments uploaded yet. Contracts and SLAs can be linked in
                the Document Storage Link section.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
