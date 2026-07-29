// Client-side workspace context (tasks + leave + clients + imports/exports).

import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getBootstrapFn, getClientDetailsFn } from "../api/queries";
import { addTaskFn, setTaskStatusFn } from "../api/tasks.mutations";
import { requestLeaveFn, decideLeaveFn } from "../api/leave.mutations";
import { uploadDocumentFn, deleteDocumentFn } from "../api/documents.mutations";
import {
  addClientFn,
  updateClientFn,
  submitClientForReviewFn,
  decideClientApprovalFn,
  addClientChangeRequestFn,
  applyClientChangeRequestFn,
  assignClientTeamOwnershipFn,
  setClientAccountsFn,
  getClientAccountsFn,
  decideClientChangeRequestFn,
  processDueChangeRequestsFn,
} from "../api/clients.mutations";
import type { ClientAccount } from "./documents";
import { runImportFn } from "../api/imports.mutations";
import { createExportFn } from "../api/exports.mutations";
import type { Person } from "./hierarchy";
import type {
  ClientRecord,
  DocumentRecord,
  ClientChangeRequest,
  ClientStatus,
  ClientSupportLevel,
  EmployeeHistoryEntry,
  ImportJob,
  ExportJob,
  ImportExportModule,
} from "./documents";

export * from "./documents";

export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "todo" | "in_progress" | "done";

export type Task = {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;
  assignerId: string;
  assigneeId: string;
  status: TaskStatus;
  createdAt: string;
};

export type LeaveStatus = "pending" | "approved" | "rejected";

export type LeaveRequest = {
  id: string;
  personId: string;
  managerId: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  createdAt: string;
  decidedAt?: string;
};

const BOOTSTRAP_QUERY_KEY = ["bootstrap"] as const;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Pure selectors
// ---------------------------------------------------------------------------

export function tasksAssignedToMe(tasks: Task[], userId: string): Task[] {
  return tasks.filter((t) => t.assigneeId === userId);
}

export function tasksAssignedByMe(tasks: Task[], userId: string): Task[] {
  return tasks.filter((t) => t.assignerId === userId);
}

export function tasksDueToday(tasks: Task[], userId: string): Task[] {
  const today = todayIso();
  return tasksAssignedToMe(tasks, userId).filter((t) => t.dueDate <= today && t.status !== "done");
}

export function openTasksAssignedByMe(tasks: Task[], userId: string): Task[] {
  return tasksAssignedByMe(tasks, userId).filter((t) => t.status !== "done");
}

export function tasksWithinBranch(tasks: Task[], branchIds: Set<string>): Task[] {
  return tasks.filter((t) => branchIds.has(t.assigneeId) && branchIds.has(t.assignerId));
}

export function pendingLeaveForApprover(
  leaveRequests: LeaveRequest[],
  approverId: string,
): LeaveRequest[] {
  return leaveRequests.filter((l) => l.managerId === approverId && l.status === "pending");
}

export function myLeaveRequests(leaveRequests: LeaveRequest[], personId: string): LeaveRequest[] {
  return leaveRequests.filter((l) => l.personId === personId);
}

export function peopleOnLeaveToday(
  leaveRequests: LeaveRequest[],
  people: Person[],
  visibleIds: Set<string>,
): Person[] {
  const today = todayIso();
  const onLeaveIds = new Set(
    leaveRequests
      .filter(
        (l) =>
          l.status === "approved" &&
          l.startDate <= today &&
          today <= l.endDate &&
          visibleIds.has(l.personId),
      )
      .map((l) => l.personId),
  );
  return people.filter((p) => onLeaveIds.has(p.id));
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

type AddTaskInput = {
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;
  assigneeId: string;
};
type RequestLeaveInput = { startDate: string; endDate: string; reason: string };
type Result = { ok: true } | { ok: false; error: string };

type ClientInput = {
  name: string;
  legalName?: string;
  shortName?: string;
  businessUnit?: string;
  billingEntity?: string;
  currency?: string;
  contractType?: string;
  contractStart?: string;
  contractEnd?: string;
  status?: ClientStatus;
  clientSupportLevel?: ClientSupportLevel;
  companyPhoneNumber?: string;
  // Section 2: Address
  clientAddressLine1?: string;
  clientAddressLine2?: string;
  clientCountry?: string;
  clientStateOrRegion?: string;
  clientCity?: string;
  clientZipOrPin?: string;
  // Section 4: Billing
  billingStartDate?: string;
  contractRenewalDate?: string;
  billingFrequency?: string;
  billingType?: string;
  oneOffDurationDays?: number;
  billingNotes?: string;
  paymentTerms?: string;
  // Section 5: Accounts
  numberOfAccounts?: number;
  // Section 7: Commercial
  applicableServiceCodes?: string;
  contractCopyLink?: string;
  scopeSummary?: string;
  commercialNotes?: string;
  // Section 11: Non-Active
  nonActiveReason?: string;
  nonActiveOtherReasonText?: string;
};

type AccountItem = {
  accountName: string;
  accountCode?: string;
  isPrimaryAccount?: boolean;
  isInScope?: boolean;
  accountStatus?: "Active" | "Inactive";
  accountLegalStructure?: string;
  billingEntity?: string;
  currency?: string;
  taxRegistrationNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  country?: string;
  stateOrRegion?: string;
  city?: string;
  zipOrPinCode?: string;
  deliveryLocation?: string;
  industryCode?: string;
  subIndustry?: string;
  businessUnitMapping?: string;
  revenueLast1Year?: string;
  employeeSize?: string;
  website?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
};

type TeamOwnershipInput = {
  id: string;
  businessUnitManagerId?: string;
  teamLeadId: string;
  assistantTeamLeadId?: string;
  backupBusinessUnitManagerId?: string;
  backupTeamLeadId?: string;
  backupAssistantTeamLeadId?: string;
  numberOfFinanceAnalysts?: number;
  financeAnalyst1Id?: string;
  backupFinanceAnalyst1Id?: string;
  financeAnalyst2Id?: string;
  backupFinanceAnalyst2Id?: string;
  financeAnalyst3Id?: string;
  backupFinanceAnalyst3Id?: string;
  financeAnalyst4Id?: string;
  backupFinanceAnalyst4Id?: string;
  financeAnalyst5Id?: string;
  backupFinanceAnalyst5Id?: string;
};
type ChangeRequestInput = {
  clientId: string;
  field: "Business Unit" | "Billing Entity" | "Client Status";
  newValue: string;
  effectiveFrom: string;
  reason?: string;
};
type ImportResult =
  | {
      ok: true;
      jobId: string;
      totalRows: number;
      successRows: number;
      failedRows: number;
      errors: { row: number; field: string; message: string }[];
    }
  | { ok: false; error: string };
type ExportResult = { ok: true; csv: string; rowCount: number } | { ok: false; error: string };

import { useState } from "react";
import { Client360Dialog } from "@/components/shared/Client360Dialog";

type WorkspaceContextValue = {
  tasks: Task[];
  leaveRequests: LeaveRequest[];
  clients: ClientRecord[];
  documents: DocumentRecord[];
  clientChangeRequests: ClientChangeRequest[];
  employeeHistory: EmployeeHistoryEntry[];
  importJobs: ImportJob[];
  exportJobs: ExportJob[];
  hydrated: boolean;
  selected360Client: ClientRecord | null;
  openClient360: (clientOrId: string | ClientRecord) => void;
  closeClient360: () => void;
  addTask: (input: AddTaskInput) => Promise<Result>;
  setTaskStatus: (id: string, status: TaskStatus) => Promise<Result>;
  requestLeave: (input: RequestLeaveInput) => Promise<Result>;
  decideLeave: (id: string, decision: "approved" | "rejected") => Promise<Result>;
  uploadDocument: (formData: FormData) => Promise<Result>;
  deleteDocument: (id: string) => Promise<Result>;
  addClient: (input: ClientInput) => Promise<Result & { id?: string; code?: string }>;
  updateClient: (id: string, input: ClientInput) => Promise<Result>;
  submitClientForReview: (id: string) => Promise<Result>;
  decideClientApproval: (
    id: string,
    decision: "Approved" | "Rejected" | "Sent Back for Correction",
    note?: string,
  ) => Promise<Result>;
  addClientChangeRequest: (input: ChangeRequestInput) => Promise<Result>;
  applyClientChangeRequest: (id: string) => Promise<Result>;
  decideClientChangeRequest: (
    id: string,
    decision: "Approved" | "Rejected" | "Sent Back",
    note?: string,
  ) => Promise<Result>;
  processDueChangeRequests: () => Promise<Result & { count?: number }>;
  assignClientTeamOwnership: (input: TeamOwnershipInput) => Promise<Result>;
  setClientAccounts: (clientId: string, accounts: AccountItem[]) => Promise<Result>;
  getClientAccounts: (clientId: string) => Promise<ClientAccount[]>;
  getClientSoftwareStacks: (clientId: string) => Promise<any[]>;
  getClientHistory: (clientId: string) => Promise<any[]>;
  runImport: (input: {
    module: ImportExportModule;
    fileName: string;
    fileText: string;
  }) => Promise<ImportResult>;
  createExport: (input: { module: ImportExportModule }) => Promise<ExportResult>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [selected360Client, setSelected360Client] = useState<ClientRecord | null>(null);

  const bootstrapQuery = useQuery({
    queryKey: BOOTSTRAP_QUERY_KEY,
    queryFn: () => getBootstrapFn(),
  });

  const tasks = bootstrapQuery.data?.tasks ?? [];
  const leaveRequests = bootstrapQuery.data?.leaveRequests ?? [];
  const clients = bootstrapQuery.data?.clients ?? [];
  const documents = bootstrapQuery.data?.documents ?? [];
  const clientChangeRequests = bootstrapQuery.data?.clientChangeRequests ?? [];
  const employeeHistory = bootstrapQuery.data?.employeeHistory ?? [];
  const importJobs = bootstrapQuery.data?.importJobs ?? [];
  const exportJobs = bootstrapQuery.data?.exportJobs ?? [];
  const hydrated = bootstrapQuery.isFetched;

  function openClient360(clientOrId: string | ClientRecord) {
    if (typeof clientOrId === "string") {
      const match = clients.find(
        (c) => c.id === clientOrId || c.name.toLowerCase() === clientOrId.toLowerCase(),
      );
      if (match) setSelected360Client(match);
    } else {
      setSelected360Client(clientOrId);
    }
  }

  function closeClient360() {
    setSelected360Client(null);
  }

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: BOOTSTRAP_QUERY_KEY });
  }

  async function addTask(input: AddTaskInput): Promise<Result> {
    const result = await addTaskFn({ data: input });
    if (result.ok) await refresh();
    return result;
  }

  async function setTaskStatus(id: string, status: TaskStatus): Promise<Result> {
    const result = await setTaskStatusFn({ data: { id, status } });
    if (result.ok) await refresh();
    return result;
  }

  async function requestLeave(input: RequestLeaveInput): Promise<Result> {
    const result = await requestLeaveFn({ data: input });
    if (result.ok) await refresh();
    return result;
  }

  async function decideLeave(id: string, decision: "approved" | "rejected"): Promise<Result> {
    const result = await decideLeaveFn({ data: { id, decision } });
    if (result.ok) await refresh();
    return result;
  }

  async function uploadDocument(formData: FormData): Promise<Result> {
    const result = await uploadDocumentFn({ data: formData });
    if (result.ok) await refresh();
    return result;
  }

  async function deleteDocument(id: string): Promise<Result> {
    const result = await deleteDocumentFn({ data: { id } });
    if (result.ok) await refresh();
    return result;
  }

  async function addClient(input: ClientInput): Promise<Result & { id?: string; code?: string }> {
    const result = await addClientFn({ data: input });
    if (result.ok) await refresh();
    return result;
  }

  async function updateClient(id: string, input: ClientInput): Promise<Result> {
    const result = await updateClientFn({ data: { id, ...input } });
    if (result.ok) await refresh();
    return result;
  }

  async function submitClientForReview(id: string): Promise<Result> {
    const result = await submitClientForReviewFn({ data: { id } });
    if (result.ok) await refresh();
    return result;
  }

  async function decideClientApproval(
    id: string,
    decision: "Approved" | "Rejected" | "Sent Back for Correction",
    note?: string,
  ): Promise<Result> {
    const result = await decideClientApprovalFn({ data: { id, decision, note } });
    if (result.ok) await refresh();
    return result;
  }

  async function addClientChangeRequest(input: ChangeRequestInput): Promise<Result> {
    const result = await addClientChangeRequestFn({ data: input });
    if (result.ok) await refresh();
    return result;
  }

  async function applyClientChangeRequest(id: string): Promise<Result> {
    const result = await applyClientChangeRequestFn({ data: { id } });
    if (result.ok) await refresh();
    return result;
  }

  async function decideClientChangeRequest(
    id: string,
    decision: "Approved" | "Rejected" | "Sent Back",
    note?: string,
  ): Promise<Result> {
    const result = await decideClientChangeRequestFn({ data: { id, decision, note } });
    if (result.ok) await refresh();
    return result;
  }

  async function processDueChangeRequests(): Promise<Result & { count?: number }> {
    const result = await processDueChangeRequestsFn();
    if (result.ok) await refresh();
    return result;
  }

  async function assignClientTeamOwnership(input: TeamOwnershipInput): Promise<Result> {
    const result = await assignClientTeamOwnershipFn({ data: input });
    if (result.ok) await refresh();
    return result;
  }

  async function setClientAccounts(clientId: string, accounts: AccountItem[]): Promise<Result> {
    const result = await setClientAccountsFn({ data: { clientId, accounts } });
    if (result.ok) await refresh();
    return result;
  }

  async function getClientAccounts(clientId: string): Promise<ClientAccount[]> {
    try {
      return await getClientAccountsFn({ data: { clientId } });
    } catch {
      return [];
    }
  }

  async function getClientSoftwareStacks(clientId: string): Promise<any[]> {
    try {
      const details = await getClientDetailsFn({ data: { clientId } });
      return details.softwareStacks || [];
    } catch {
      return [];
    }
  }

  async function getClientHistory(clientId: string): Promise<any[]> {
    try {
      const details = await getClientDetailsFn({ data: { clientId } });
      return details.history || [];
    } catch {
      return [];
    }
  }

  async function runImport(input: {
    module: ImportExportModule;
    fileName: string;
    fileText: string;
  }): Promise<ImportResult> {
    const result = await runImportFn({ data: input });
    if (result.ok) await refresh();
    return result;
  }

  async function createExport(input: { module: ImportExportModule }): Promise<ExportResult> {
    const result = await createExportFn({ data: input });
    if (result.ok) await refresh();
    return result;
  }

  const value: WorkspaceContextValue = {
    tasks,
    leaveRequests,
    clients,
    documents,
    clientChangeRequests,
    employeeHistory,
    importJobs,
    exportJobs,
    hydrated,
    selected360Client,
    openClient360,
    closeClient360,
    addTask,
    setTaskStatus,
    requestLeave,
    decideLeave,
    uploadDocument,
    deleteDocument,
    addClient,
    updateClient,
    submitClientForReview,
    decideClientApproval,
    addClientChangeRequest,
    applyClientChangeRequest,
    decideClientChangeRequest,
    processDueChangeRequests,
    assignClientTeamOwnership,
    setClientAccounts,
    getClientAccounts,
    getClientSoftwareStacks,
    getClientHistory,
    runImport,
    createExport,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
      <Client360Dialog
        client={selected360Client}
        open={Boolean(selected360Client)}
        onClose={closeClient360}
      />
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return context;
}
