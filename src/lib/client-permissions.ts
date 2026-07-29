import type { Person } from "./hierarchy";
import type { ClientRecord } from "./documents";

export type ClientRole =
  | "CEO"
  | "Managing Director"
  | "Business Unit Head"
  | "Marketing Head"
  | "Finance Head"
  | "Team Lead"
  | "Assistant Team Lead"
  | "Human Resources"
  | "Employee"
  | "Administrator (IT)";

/**
 * Single source of truth mapping user designation directly to role.
 * DO NOT use email, department, or other logic to infer role.
 */
export function getClientRole(user: Person | null): ClientRole {
  if (!user) return "Employee";
  const desig = user.designation;

  if (desig === "CEO") return "CEO";
  if (desig === "Managing Director") return "Managing Director";
  if (desig === "Admin") return "Administrator (IT)";
  if (desig === "Marketing Head") return "Marketing Head";
  if (desig === "Finance Head") return "Finance Head";
  if (desig === "Human Resources") return "Human Resources";
  if (desig === "Business Unit Head") return "Business Unit Head";
  if (desig === "Team Lead") return "Team Lead";
  if (desig === "Assistant Team Lead") return "Assistant Team Lead";

  return "Employee";
}

/** Helper to match client business unit against BU Head primary/secondary business unit */
export function isUserInClientBU(user: Person | null, client: ClientRecord | null): boolean {
  if (!user || !client || !client.businessUnit) return false;
  const userBU = user.primaryBusinessUnit || user.secondaryBusinessUnit || "";
  return (
    client.businessUnit === userBU ||
    (Boolean(user.secondaryBusinessUnit) && client.businessUnit === user.secondaryBusinessUnit)
  );
}

/** Helper to check if a client is assigned to a delivery team role */
export function isClientAssignedToPerson(c: ClientRecord, userId: string): boolean {
  return Boolean(
    c.teamLeadId === userId ||
    c.assistantTeamLeadId === userId ||
    c.businessUnitManagerId === userId ||
    c.backupTeamLeadId === userId ||
    c.backupAssistantTeamLeadId === userId ||
    c.backupBusinessUnitManagerId === userId ||
    c.financeAnalyst1Id === userId ||
    c.backupFinanceAnalyst1Id === userId ||
    c.financeAnalyst2Id === userId ||
    c.backupFinanceAnalyst2Id === userId ||
    c.financeAnalyst3Id === userId ||
    c.backupFinanceAnalyst3Id === userId ||
    c.financeAnalyst4Id === userId ||
    c.backupFinanceAnalyst4Id === userId ||
    c.financeAnalyst5Id === userId ||
    c.backupFinanceAnalyst5Id === userId,
  );
}

/**
 * CLIENT CREATION
 * Only Finance Head and Marketing Head can create clients or save drafts.
 */
export function canCreateClient(user: Person | null): boolean {
  const role = getClientRole(user);
  return role === "Finance Head" || role === "Marketing Head";
}

/**
 * GENERAL CLIENT EDIT
 * Finance Head / Marketing Head: if they created the draft or correction request.
 * BU Head: if they belong to the same BU (for company info edits only).
 */
export function canEditClient(user: Person | null, client: ClientRecord | null): boolean {
  if (!user || !client) return false;
  const role = getClientRole(user);

  if (role === "Finance Head" || role === "Marketing Head") {
    const userId = user.id;
    const userName = user.name.toLowerCase();
    const isCreator = Boolean(
      (client.createdBy &&
        (client.createdBy === userId || client.createdBy.toLowerCase() === userName)) ||
      (client.lastUpdatedBy &&
        (client.lastUpdatedBy === userId || client.lastUpdatedBy.toLowerCase() === userName)),
    );
    return (
      isCreator &&
      (client.recordStatus === "Draft" || client.recordStatus === "Sent Back for Correction")
    );
  }

  if (role === "Business Unit Head") {
    return isUserInClientBU(user, client);
  }

  return false;
}

/**
 * COMPANY INFORMATION EDIT
 * Allowed for Finance/Marketing Head (if creator) and BU Head (BU match).
 */
export function canEditCompanyInformation(
  user: Person | null,
  client: ClientRecord | null,
): boolean {
  return canEditClient(user, client);
}

/**
 * SUBMIT FOR APPROVAL
 * Only Finance Head and Marketing Head can submit client records.
 */
export function canSubmitClient(user: Person | null, client: ClientRecord | null): boolean {
  const role = getClientRole(user);
  if (role !== "Finance Head" && role !== "Marketing Head") return false;
  return canEditClient(user, client);
}

/**
 * CLIENT APPROVAL / REJECT / SEND BACK
 * Only BU Head (BU match) can approve/reject/send back.
 */
export function canReviewClientApproval(user: Person | null, client: ClientRecord | null): boolean {
  if (!user) return false;
  const role = getClientRole(user);
  if (role !== "Business Unit Head") return false;
  if (!client) return true; // generalized capability check
  return isUserInClientBU(user, client);
}

export function canApproveClient(user: Person | null, client: ClientRecord | null): boolean {
  return canReviewClientApproval(user, client);
}

export function canRejectClient(user: Person | null, client: ClientRecord | null): boolean {
  return canReviewClientApproval(user, client);
}

export function canSendBackClient(user: Person | null, client: ClientRecord | null): boolean {
  return canReviewClientApproval(user, client);
}

/**
 * CHANGE REQUESTS
 * Finance Head, Marketing Head, and BU Head can raise Change Requests.
 */
export function canRaiseChangeRequest(user: Person | null, client: ClientRecord | null): boolean {
  if (!user) return false;
  const role = getClientRole(user);
  if (role === "Finance Head" || role === "Marketing Head") return true;
  if (role === "Business Unit Head") {
    if (!client) return true;
    return isUserInClientBU(user, client);
  }
  return false;
}

/** Only BU Head can approve/reject change requests */
export function canApproveChangeRequest(user: Person | null, client: ClientRecord | null): boolean {
  return canReviewClientApproval(user, client);
}

/**
 * TEAM OWNERSHIP
 * Only BU Head can assign or replace Team Lead.
 */
export function canAssignTeamLead(user: Person | null, client: ClientRecord | null): boolean {
  if (!user) return false;
  const role = getClientRole(user);
  if (role !== "Business Unit Head") return false;
  if (!client) return true;
  return isUserInClientBU(user, client);
}

/**
 * DELIVERY TEAM MANAGEMENT
 * Only the assigned Team Lead can manage the remaining delivery team.
 */
export function canManageDeliveryTeam(user: Person | null, client: ClientRecord | null): boolean {
  if (!user || !client) return false;
  const role = getClientRole(user);
  return role === "Team Lead" && client.teamLeadId === user.id;
}

/**
 * CLIENT VISIBILITY
 * CEO, MD, Admin see all.
 * BU Head sees same BU.
 * Finance/Marketing Heads see creator drafts/correction requests.
 * TL, ATL, HR, Employee see assigned clients.
 */
export function canViewClient(user: Person | null, client: ClientRecord | null): boolean {
  if (!user || !client) return false;
  const role = getClientRole(user);

  if (role === "CEO" || role === "Managing Director" || role === "Administrator (IT)") {
    return true;
  }

  if (role === "Business Unit Head") {
    return isUserInClientBU(user, client);
  }

  const userId = user.id;
  const userName = user.name.toLowerCase();
  const isCreator = Boolean(
    (client.createdBy &&
      (client.createdBy === userId || client.createdBy.toLowerCase() === userName)) ||
    (client.lastUpdatedBy &&
      (client.lastUpdatedBy === userId || client.lastUpdatedBy.toLowerCase() === userName)),
  );

  if (role === "Finance Head" || role === "Marketing Head") {
    return isCreator;
  }

  const isAssigned = isClientAssignedToPerson(client, userId);
  if (isAssigned) return true;

  if (role === "Team Lead" || role === "Assistant Team Lead") {
    return client.recordStatus === "Draft" && isCreator;
  }

  return false;
}

/** Every role that can view can open Client360 */
export function canOpenClient360(user: Person | null, client: ClientRecord | null): boolean {
  return canViewClient(user, client);
}

/**
 * COMMERCIAL / SENSITIVE MASKING
 * Allowed for CEO, MD, Admin, BU Head, Finance Head, Marketing Head.
 */
export function canViewCommercialInformation(user: Person | null): boolean {
  if (!user) return false;
  const role = getClientRole(user);
  return (
    role === "CEO" ||
    role === "Managing Director" ||
    role === "Administrator (IT)" ||
    role === "Business Unit Head" ||
    role === "Finance Head" ||
    role === "Marketing Head"
  );
}

export function canViewSensitiveClientInformation(user: Person | null): boolean {
  return canViewCommercialInformation(user);
}
