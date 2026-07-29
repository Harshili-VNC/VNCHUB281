// Client Master spec v1.0 & Team Ownership Workflow Enhancement.
// 1. BU Head assigns ONLY Team Lead (Mandatory).
// 2. Assigned Team Lead builds the delivery team (Assistants, Analysts, Backups).
// 3. Admin / CEO / MD can perform all actions as an override.

import { Fragment, useEffect, useState } from "react";
import { toast } from "sonner";
import { useWorkspace } from "@/lib/workspace";
import type { ClientRecord } from "@/lib/workspace";
import { useAuth, type Person } from "@/lib/auth";
import { isSuperUser, isBUHead } from "@/lib/client-visibility";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const NA = "__na__";

function emptyForm() {
  return {
    businessUnitManagerId: "",
    teamLeadId: "",
    assistantTeamLeadId: NA,
    backupBusinessUnitManagerId: NA,
    backupTeamLeadId: NA,
    backupAssistantTeamLeadId: NA,
    numberOfFinanceAnalysts: "1",
    financeAnalyst1Id: NA,
    backupFinanceAnalyst1Id: NA,
    financeAnalyst2Id: NA,
    backupFinanceAnalyst2Id: NA,
    financeAnalyst3Id: NA,
    backupFinanceAnalyst3Id: NA,
    financeAnalyst4Id: NA,
    backupFinanceAnalyst4Id: NA,
    financeAnalyst5Id: NA,
    backupFinanceAnalyst5Id: NA,
  };
}

/** Employee selector should display Employee Code + Employee Name (spec rule). */
function employeeLabel(p: Person) {
  return `${p.employeeCode} · ${p.name}`;
}

function EmployeeSelect({
  people,
  value,
  onChange,
  allowNa,
  placeholder,
  disabled,
}: {
  people: Person[];
  value: string;
  onChange: (v: string) => void;
  allowNa?: boolean;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={disabled ? "bg-surface-2 opacity-80 cursor-not-allowed" : ""}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowNa && <SelectItem value={NA}>NA</SelectItem>}
        {people
          .filter((p) => p.status === "active")
          .map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {employeeLabel(p)}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}

export function TeamOwnershipDialog({
  client,
  people,
  onClose,
}: {
  client: ClientRecord | null;
  people: Person[];
  onClose: () => void;
}) {
  const { user } = useAuth();
  const { assignClientTeamOwnership } = useWorkspace();
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const isSuper = isSuperUser(user);
  const isBuHeadRole = isBUHead(user) && !isSuper;
  const isAssignedTL = Boolean(client?.teamLeadId && user?.id === client.teamLeadId);

  // BU Head assigns ONLY Team Lead. Assigned TL or Superuser builds full team.
  const isBuHeadAssigningTLOnly = isBuHeadRole && !isAssignedTL;

  useEffect(() => {
    if (!client) return;
    setForm({
      businessUnitManagerId: client.businessUnitManagerId ?? "",
      teamLeadId: client.teamLeadId ?? "",
      assistantTeamLeadId: client.assistantTeamLeadId ?? NA,
      backupBusinessUnitManagerId: client.backupBusinessUnitManagerId ?? NA,
      backupTeamLeadId: client.backupTeamLeadId ?? NA,
      backupAssistantTeamLeadId: client.backupAssistantTeamLeadId ?? NA,
      numberOfFinanceAnalysts: String(client.numberOfFinanceAnalysts ?? 1),
      financeAnalyst1Id: client.financeAnalyst1Id ?? NA,
      backupFinanceAnalyst1Id: client.backupFinanceAnalyst1Id ?? NA,
      financeAnalyst2Id: client.financeAnalyst2Id ?? NA,
      backupFinanceAnalyst2Id: client.backupFinanceAnalyst2Id ?? NA,
      financeAnalyst3Id: client.financeAnalyst3Id ?? NA,
      backupFinanceAnalyst3Id: client.backupFinanceAnalyst3Id ?? NA,
      financeAnalyst4Id: client.financeAnalyst4Id ?? NA,
      backupFinanceAnalyst4Id: client.backupFinanceAnalyst4Id ?? NA,
      financeAnalyst5Id: client.financeAnalyst5Id ?? NA,
      backupFinanceAnalyst5Id: client.backupFinanceAnalyst5Id ?? NA,
    });
  }, [client]);

  if (!client) return null;

  const analystCount = Number(form.numberOfFinanceAnalysts);
  const analystSlots = [1, 2, 3, 4, 5].filter((n) => n <= analystCount) as (1 | 2 | 3 | 4 | 5)[];

  function set<K extends keyof ReturnType<typeof emptyForm>>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    if (!client) return;
    if (!form.teamLeadId || form.teamLeadId === NA) {
      toast.error("Team Lead assignment is required.");
      return;
    }
    const clean = (v?: string) => (!v || v.trim() === "" || v === NA ? undefined : v.trim());

    if (!isBuHeadAssigningTLOnly) {
      if (!clean(form.businessUnitManagerId)) {
        toast.error("Business Unit Manager is required when managing the delivery team.");
        return;
      }
    }

    setSaving(true);
    const isNewTlAssignment = client.teamLeadId !== form.teamLeadId;

    const result = await assignClientTeamOwnership({
      id: client.id,
      businessUnitManagerId: clean(form.businessUnitManagerId),
      teamLeadId: form.teamLeadId,
      assistantTeamLeadId: clean(form.assistantTeamLeadId),
      backupBusinessUnitManagerId: clean(form.backupBusinessUnitManagerId),
      backupTeamLeadId: clean(form.backupTeamLeadId),
      backupAssistantTeamLeadId: clean(form.backupAssistantTeamLeadId),
      numberOfFinanceAnalysts: analystCount,
      financeAnalyst1Id: clean(form.financeAnalyst1Id),
      backupFinanceAnalyst1Id: clean(form.backupFinanceAnalyst1Id),
      financeAnalyst2Id: clean(form.financeAnalyst2Id),
      backupFinanceAnalyst2Id: clean(form.backupFinanceAnalyst2Id),
      financeAnalyst3Id: clean(form.financeAnalyst3Id),
      backupFinanceAnalyst3Id: clean(form.backupFinanceAnalyst3Id),
      financeAnalyst4Id: clean(form.financeAnalyst4Id),
      backupFinanceAnalyst4Id: clean(form.backupFinanceAnalyst4Id),
      financeAnalyst5Id: clean(form.financeAnalyst5Id),
      backupFinanceAnalyst5Id: clean(form.backupFinanceAnalyst5Id),
    });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    if (isNewTlAssignment) {
      const assignedPerson = people.find((p) => p.id === form.teamLeadId);
      const tlName = assignedPerson ? assignedPerson.name : "Team Lead";
      toast.success(
        `You have been assigned as Team Lead for Client ${client.name}. Please complete the delivery team assignment. (${tlName})`,
        { duration: 6000 },
      );
    } else {
      toast.success(isBuHeadAssigningTLOnly ? "Team Lead assigned successfully." : "Delivery team structure updated.");
    }
    onClose();
  }

  return (
    <Dialog open={!!client} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isBuHeadAssigningTLOnly
              ? `Assign Team Lead — ${client.name}`
              : `Build Delivery Team — ${client.name}`}
          </DialogTitle>
          <DialogDescription>
            {isBuHeadAssigningTLOnly
              ? "Business Unit Head Responsibility: Assign the mandatory Team Lead for this client. The assigned Team Lead will build the remaining delivery team."
              : "Team Lead Responsibility: Assign and manage the delivery team members for this client."}
          </DialogDescription>
        </DialogHeader>

        {isBuHeadAssigningTLOnly ? (
          /* BU Head View: Assigns ONLY Team Lead and Backup TL */
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2">
              <Label>Team Lead <span className="text-rose-500 font-bold">*</span></Label>
              <EmployeeSelect
                people={people}
                value={form.teamLeadId}
                onChange={(v) => set("teamLeadId", v)}
                placeholder="Select mandatory Team Lead"
              />
            </div>
            <div className="col-span-2">
              <Label>Backup for Team Lead (Optional)</Label>
              <EmployeeSelect
                people={people}
                value={form.backupTeamLeadId}
                onChange={(v) => set("backupTeamLeadId", v)}
                allowNa
                placeholder="NA"
              />
            </div>
          </div>
        ) : (
          /* Assigned Team Lead / Superuser View: Builds full delivery team */
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Team Lead <span className="text-rose-500 font-bold">*</span></Label>
              <EmployeeSelect
                people={people}
                value={form.teamLeadId}
                onChange={(v) => set("teamLeadId", v)}
                placeholder="Select employee"
                disabled={isAssignedTL && !isSuper}
              />
            </div>
            <div>
              <Label>Backup for Team Lead</Label>
              <EmployeeSelect
                people={people}
                value={form.backupTeamLeadId}
                onChange={(v) => set("backupTeamLeadId", v)}
                allowNa
                placeholder="NA"
              />
            </div>
            <div>
              <Label>Business Unit Manager</Label>
              <EmployeeSelect
                people={people}
                value={form.businessUnitManagerId}
                onChange={(v) => set("businessUnitManagerId", v)}
                allowNa
                placeholder="Select employee"
              />
            </div>
            <div>
              <Label>Backup for Business Unit Manager</Label>
              <EmployeeSelect
                people={people}
                value={form.backupBusinessUnitManagerId}
                onChange={(v) => set("backupBusinessUnitManagerId", v)}
                allowNa
                placeholder="NA"
              />
            </div>
            <div>
              <Label>Assistant Team Lead</Label>
              <EmployeeSelect
                people={people}
                value={form.assistantTeamLeadId}
                onChange={(v) => set("assistantTeamLeadId", v)}
                allowNa
                placeholder="NA"
              />
            </div>
            <div>
              <Label>Backup for Assistant Team Lead</Label>
              <EmployeeSelect
                people={people}
                value={form.backupAssistantTeamLeadId}
                onChange={(v) => set("backupAssistantTeamLeadId", v)}
                allowNa
                placeholder="NA"
              />
            </div>
            <div className="col-span-2">
              <Label>Number of Finance Analysts</Label>
              <Select
                value={form.numberOfFinanceAnalysts}
                onValueChange={(v) => set("numberOfFinanceAnalysts", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} Analyst(s)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {analystSlots.map((n) => (
              <Fragment key={n}>
                <div>
                  <Label>Finance Analyst {n}</Label>
                  <EmployeeSelect
                    people={people}
                    value={form[`financeAnalyst${n}Id` as const]}
                    onChange={(v) => set(`financeAnalyst${n}Id` as const, v)}
                    allowNa
                    placeholder="NA"
                  />
                </div>
                <div>
                  <Label>Backup for Finance Analyst {n}</Label>
                  <EmployeeSelect
                    people={people}
                    value={form[`backupFinanceAnalyst${n}Id` as const]}
                    onChange={(v) => set(`backupFinanceAnalyst${n}Id` as const, v)}
                    allowNa
                    placeholder="NA"
                  />
                </div>
              </Fragment>
            ))}
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : isBuHeadAssigningTLOnly ? "Assign Team Lead" : "Save Delivery Team"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

