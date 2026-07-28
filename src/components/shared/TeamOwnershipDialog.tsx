// Client Master spec v1.0, Section 9: Team Ownership Structure.
// Lets the BU Head / Finance / Admin assign delivery ownership for a client
// once it's Approved: Business Unit Manager, Team Lead, Assistant Team Lead
// (+ optional backups for each), and 1-5 Finance Analysts (+ optional backups).

import { Fragment, useEffect, useState } from "react";
import { toast } from "sonner";
import { useWorkspace } from "@/lib/workspace";
import type { ClientRecord } from "@/lib/workspace";
import type { Person } from "@/lib/hierarchy";
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
}: {
  people: Person[];
  value: string;
  onChange: (v: string) => void;
  allowNa?: boolean;
  placeholder: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
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
  const { assignClientTeamOwnership } = useWorkspace();
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

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
    if (!form.businessUnitManagerId || !form.teamLeadId) {
      toast.error("Business Unit Manager and Team Lead are required.");
      return;
    }
    setSaving(true);
    const clean = (v: string) => (v === NA ? undefined : v);
    const result = await assignClientTeamOwnership({
      id: client.id,
      businessUnitManagerId: form.businessUnitManagerId,
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
    toast.success("Team ownership updated");
    onClose();
  }

  return (
    <Dialog open={!!client} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Team ownership — {client.name}</DialogTitle>
          <DialogDescription>
            Business Unit Manager and Team Lead are required. Everything else is optional.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Business Unit Manager</Label>
            <EmployeeSelect
              people={people}
              value={form.businessUnitManagerId}
              onChange={(v) => set("businessUnitManagerId", v)}
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
            <Label>Team Lead</Label>
            <EmployeeSelect
              people={people}
              value={form.teamLeadId}
              onChange={(v) => set("teamLeadId", v)}
              placeholder="Select employee"
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
                    {n}
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

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
