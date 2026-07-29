import type { Person } from "./hierarchy";
import type { ClientRecord } from "./documents";

/**
 * Superusers (CEO, Managing Director, Admin) have unrestricted access across all BUs.
 */
export function isSuperUser(user: Person | null): boolean {
  if (!user) return false;
  const email = user.email.toLowerCase();
  const designation = (user.designation ?? "").toLowerCase();
  const dept = user.departmentFunction;

  return (
    email === "ceo@vnc.com" ||
    email === "md@vnc.com" ||
    email === "admin@vnc.com" ||
    dept === "Admin" ||
    dept === "Leadership" ||
    designation === "ceo" ||
    designation === "managing director" ||
    designation === "admin" ||
    designation.includes("chief executive")
  );
}

/**
 * Checks if user is a Business Unit Head.
 */
export function isBUHead(user: Person | null): boolean {
  if (!user) return false;
  const designation = (user.designation ?? "").toLowerCase();
  const email = user.email.toLowerCase();

  return (
    Boolean(user.isBusinessUnitHead) ||
    designation === "business unit head" ||
    designation.includes("bu head") ||
    email.startsWith("buhead.")
  );
}

/**
 * Checks if user is Finance Head or Marketing Head.
 */
export function isFinanceOrMarketingHead(user: Person | null): boolean {
  if (!user) return false;
  const designation = (user.designation ?? "").toLowerCase();
  const dept = user.departmentFunction;
  const email = user.email.toLowerCase();

  const isFinanceHead = designation === "finance head" || (dept === "Finance" && email.includes("finance.head")) || dept === "Finance";
  const isMarketingHead = designation === "marketing head" || (dept === "Marketing" && email.includes("marketing.head")) || dept === "Marketing";

  return isFinanceHead || isMarketingHead;
}

/**
 * Determines whether user can view sensitive commercial & financial information.
 * Allowed ONLY for: CEO, Managing Director, Admin, and Business Unit Head.
 */
export function canViewSensitiveClientData(user: Person | null): boolean {
  return isSuperUser(user) || isBUHead(user);
}

/**
 * ONLY Marketing Head and Finance Head can create a new Client Master.
 * No other role (including CEO, MD, Admin, BU Head) may create a client.
 */
export function canCreateClient(user: Person | null): boolean {
  if (!user) return false;
  return isFinanceOrMarketingHead(user);
}

export function isUserInClientBU(user: Person | null, client: ClientRecord | null): boolean {
  if (!user || !client || !client.businessUnit) return false;
  const userBU = user.primaryBusinessUnit || user.secondaryBusinessUnit || "";
  return client.businessUnit === userBU || (Boolean(user.secondaryBusinessUnit) && client.businessUnit === user.secondaryBusinessUnit);
}

/**
 * Action: Edit / Company Information
 * Allowed ONLY for:
 * - Finance Head & Marketing Head
 * - Business Unit Head (only for clients belonging to their own BU)
 * CEO, MD, Admin, Team Lead, Assistant Team Lead, HR, Employee MUST NOT edit.
 */
export function canEditClient(user: Person | null, client: ClientRecord | null): boolean {
  if (!user || !client) return false;

  // CEO, Managing Director, Admin CANNOT edit
  if (isSuperUser(user)) return false;

  // Business Unit Head CAN edit company information if client belongs to their BU
  if (isBUHead(user)) {
    return isUserInClientBU(user, client);
  }

  // Finance Head & Marketing Head CAN edit
  if (isFinanceOrMarketingHead(user)) {
    return true;
  }

  // Team Lead, Assistant TL, HR, Employee CANNOT edit
  return false;
}

/**
 * Company Information permission is identical to Edit.
 */
export function canEditCompanyInfo(user: Person | null, client: ClientRecord | null): boolean {
  return canEditClient(user, client);
}

/**
 * Action: Manage Team
 * Allowed ONLY for:
 * - Business Unit Head (only for clients belonging to their own BU)
 * - Assigned Team Lead (only for clients where client.teamLeadId === user.id)
 * CEO, MD, Admin, Finance Head, Marketing Head, Assistant Team Lead, HR, Employee MUST NOT manage team.
 */
export function canManageTeam(user: Person | null, client: ClientRecord | null): boolean {
  if (!user || !client) return false;

  // Business Unit Head CAN manage team (only for clients belonging to their BU)
  if (isBUHead(user)) {
    return isUserInClientBU(user, client);
  }

  // Assigned Team Lead CAN manage team (only if assigned as Team Lead for this client)
  if (client.teamLeadId && client.teamLeadId === user.id) {
    return true;
  }

  // Every other role (CEO, MD, Admin, Finance Head, Marketing Head, Assistant TL, HR, Employee) CANNOT manage team
  return false;
}

export function canManageClientMaster(user: Person | null): boolean {
  if (!user) return false;
  return isFinanceOrMarketingHead(user) || isBUHead(user);
}

/**
 * ONLY Marketing Head and Finance Head can submit a client for approval.
 */
export function canSubmitClient(user: Person | null, client: ClientRecord | null): boolean {
  if (!user || !client) return false;
  if (!isFinanceOrMarketingHead(user)) return false;
  return canEditClient(user, client);
}

/**
 * ONLY the respective Business Unit Head (or Admin/CEO/MD override) can Approve/Reject/Send Back.
 */
export function canApproveClient(user: Person | null, client?: ClientRecord | null): boolean {
  if (!user) return false;
  if (isSuperUser(user)) return true;
  if (!isBUHead(user)) return false;

  if (client && client.businessUnit) {
    const userBU = user.primaryBusinessUnit || user.secondaryBusinessUnit;
    if (userBU && client.businessUnit !== userBU) return false;
  }

  return true;
}

function isClientAssignedToPerson(c: ClientRecord, userId: string): boolean {
  return Boolean(
    c.teamLeadId === userId ||
    c.assistantTeamLeadId === userId ||
    c.businessUnitManagerId === userId ||
    c.backupTeamLeadId === userId ||
    c.backupAssistantTeamLeadId === userId ||
    c.backupBusinessUnitManagerId === userId ||
    c.financeAnalyst1Id === userId ||
    c.financeAnalyst2Id === userId ||
    c.financeAnalyst3Id === userId ||
    c.financeAnalyst4Id === userId ||
    c.financeAnalyst5Id === userId
  );
}

/**
 * Core Business Unit-Based Client Visibility Rule:
 * 1. CEO, Managing Director, Admin: view every client across every Business Unit.
 * 2. Finance Head & Marketing Head: view only clients created by themselves.
 * 3. Business Unit Head: view every client belonging to their Business Unit.
 * 4. Team Lead, Assistant Team Lead, Employee: view only assigned clients (+ own created drafts).
 * 5. Human Resources: No access unless explicitly assigned.
 */
export function filterClientsByRole(clients: ClientRecord[], user: Person | null): ClientRecord[] {
  if (!user) return [];

  // Rule 1: CEO, MD, Admin view everything
  if (isSuperUser(user)) {
    return clients;
  }

  const userBU = user.primaryBusinessUnit || user.secondaryBusinessUnit || "";
  const userName = user.name.toLowerCase();
  const userId = user.id;

  // Rule 2: Finance Head & Marketing Head view only clients created by themselves
  if (isFinanceOrMarketingHead(user)) {
    return clients.filter((c) => {
      const isCreator =
        (c.createdBy && (c.createdBy === userId || c.createdBy.toLowerCase() === userName)) ||
        (c.lastUpdatedBy && (c.lastUpdatedBy === userId || c.lastUpdatedBy.toLowerCase() === userName));
      const isAssignedForCorrection = c.recordStatus === "Sent Back for Correction" && isCreator;
      return isCreator || isAssignedForCorrection;
    });
  }

  // Rule 3: Business Unit Head -> view all clients in their BU
  if (isBUHead(user)) {
    return clients.filter((c) => {
      if (!userBU) return false;
      return c.businessUnit === userBU || (c.businessUnit && user.secondaryBusinessUnit === c.businessUnit);
    });
  }

  // Rule 4: HR has no Client Master access unless assigned
  if (user.departmentFunction === "HR" || (user.designation ?? "").toLowerCase().includes("human resources")) {
    return clients.filter((c) => isClientAssignedToPerson(c, userId));
  }

  // Rule 5: Team Lead, Assistant Team Lead, Employee view ONLY assigned clients (+ own created drafts)
  return clients.filter((c) => {
    const isAssigned = isClientAssignedToPerson(c, userId);
    if (isAssigned) return true;

    const isCreator =
      (c.createdBy && (c.createdBy === userId || c.createdBy.toLowerCase() === userName)) ||
      (c.lastUpdatedBy && (c.lastUpdatedBy === userId || c.lastUpdatedBy.toLowerCase() === userName));

    return c.recordStatus === "Draft" && isCreator;
  });
}
