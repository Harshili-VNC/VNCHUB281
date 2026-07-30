/**
 * CLIENT MASTER SPECIFICATION (v1.0) & ENTERPRISE PERMISSION MATRIX ENFORCEMENT
 *
 * Single Source of Truth for Client Authorization logic.
 * Every function strictly respects userPermissions from Enterprise Permission Management.
 */

import type { Person } from "./hierarchy";
import type { ClientRecord } from "./documents";
import { hasPermission } from "./permissions";

export type ClientRole =
  | "CEO"
  | "Managing Director"
  | "Finance Head"
  | "Marketing Head"
  | "Business Unit Head"
  | "Team Lead"
  | "Assistant Team Lead"
  | "Team Member";

export function getClientRole(user: Person | null): ClientRole {
  if (!user) return "Team Member";

  const desig = user.designation ?? "";
  const deptFunc = user.departmentFunction;

  if (desig === "CEO") return "CEO";
  if (desig === "Managing Director") return "Managing Director";
  if (desig.toLowerCase().includes("finance head")) return "Finance Head";
  if (desig.toLowerCase().includes("marketing head")) return "Marketing Head";
  if (user.isBusinessUnitHead || desig.toLowerCase().includes("business unit head")) {
    return "Business Unit Head";
  }

  if (deptFunc === "Leadership") return "CEO";
  if (deptFunc === "Admin") return "Team Member";

  if (user.isTeamLead || desig.toLowerCase().includes("team lead")) {
    if (desig.toLowerCase().includes("assistant")) return "Assistant Team Lead";
    return "Team Lead";
  }

  return "Team Member";
}

export function isUserInClientBU(user: Person, client: ClientRecord): boolean {
  if (!client.businessUnit) return true;
  const userBU = (user.primaryBusinessUnit ?? "").toLowerCase();
  const clientBU = (client.businessUnit ?? "").toLowerCase();

  if (userBU && clientBU && userBU === clientBU) return true;

  if (user.secondaryBusinessUnit) {
    const secBU = user.secondaryBusinessUnit.toLowerCase();
    if (secBU === clientBU) return true;
  }

  return false;
}

export function isClientAssignedToPerson(client: ClientRecord, userId: string): boolean {
  if (client.teamLeadId === userId) return true;
  return false;
}

/**
 * CLIENT CREATION
 * Enforces client.create permission.
 */
export function canCreateClient(user: Person | null, userPermissions?: Record<string, boolean>): boolean {
  if (!user) return false;
  if (userPermissions && Object.keys(userPermissions).length > 0) {
    return hasPermission(userPermissions, "client.create");
  }
  const role = getClientRole(user);
  return role === "Finance Head" || role === "Marketing Head" || role === "CEO" || role === "Managing Director";
}

/**
 * GENERAL CLIENT EDIT
 * Enforces client.edit permission.
 */
export function canEditClient(user: Person | null, client: ClientRecord | null, userPermissions?: Record<string, boolean>): boolean {
  if (!user || !client) return false;
  if (userPermissions && Object.keys(userPermissions).length > 0) {
    if (!hasPermission(userPermissions, "client.edit")) return false;
  }
  const role = getClientRole(user);

  if (role === "CEO" || role === "Managing Director") return true;

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

  return false;
}

export function canEditCompanyInformation(
  user: Person | null,
  client: ClientRecord | null,
  userPermissions?: Record<string, boolean>,
): boolean {
  return canEditClient(user, client, userPermissions);
}

/**
 * SUBMIT FOR APPROVAL
 */
export function canSubmitClient(user: Person | null, client: ClientRecord | null, userPermissions?: Record<string, boolean>): boolean {
  if (!user) return false;
  if (userPermissions && Object.keys(userPermissions).length > 0) {
    if (!hasPermission(userPermissions, "client.edit")) return false;
  }
  return canEditClient(user, client, userPermissions);
}

/**
 * CLIENT APPROVAL / REJECT / SEND BACK
 */
export function canReviewClientApproval(user: Person | null, client: ClientRecord | null, userPermissions?: Record<string, boolean>): boolean {
  if (!user) return false;
  if (userPermissions && Object.keys(userPermissions).length > 0) {
    if (!hasPermission(userPermissions, "client.approve")) return false;
  }
  const role = getClientRole(user);
  if (role === "CEO" || role === "Managing Director") return true;
  if (role !== "Business Unit Head") return false;
  if (!client) return true;
  return isUserInClientBU(user, client);
}

export function canApproveClient(user: Person | null, client: ClientRecord | null, userPermissions?: Record<string, boolean>): boolean {
  if (userPermissions && Object.keys(userPermissions).length > 0) {
    if (!hasPermission(userPermissions, "client.approve")) return false;
  }
  return canReviewClientApproval(user, client, userPermissions);
}

export function canRejectClient(user: Person | null, client: ClientRecord | null, userPermissions?: Record<string, boolean>): boolean {
  if (userPermissions && Object.keys(userPermissions).length > 0) {
    if (!hasPermission(userPermissions, "client.reject")) return false;
  }
  return canReviewClientApproval(user, client, userPermissions);
}

export function canSendBackClient(user: Person | null, client: ClientRecord | null, userPermissions?: Record<string, boolean>): boolean {
  if (userPermissions && Object.keys(userPermissions).length > 0) {
    if (!hasPermission(userPermissions, "client.send_back")) return false;
  }
  return canReviewClientApproval(user, client, userPermissions);
}

/**
 * CHANGE REQUESTS
 */
export function canRaiseChangeRequest(user: Person | null, client: ClientRecord | null, userPermissions?: Record<string, boolean>): boolean {
  if (!user) return false;
  if (userPermissions && Object.keys(userPermissions).length > 0) {
    if (!hasPermission(userPermissions, "client.edit")) return false;
  }
  const role = getClientRole(user);
  if (role === "CEO" || role === "Managing Director" || role === "Finance Head" || role === "Marketing Head") return true;
  if (role === "Business Unit Head") {
    if (!client) return true;
    return isUserInClientBU(user, client);
  }
  return false;
}

export function canApproveChangeRequest(user: Person | null, client: ClientRecord | null, userPermissions?: Record<string, boolean>): boolean {
  return canApproveClient(user, client, userPermissions);
}

export function isClientSuperUser(user: Person | null, userPermissions?: Record<string, boolean>): boolean {
  if (userPermissions && Object.keys(userPermissions).length > 0) {
    return hasPermission(userPermissions, "client.view") && hasPermission(userPermissions, "client.edit");
  }
  const role = getClientRole(user);
  return role === "CEO" || role === "Managing Director";
}

/**
 * TEAM OWNERSHIP
 */
export function canAssignTeamLead(user: Person | null, client: ClientRecord | null, userPermissions?: Record<string, boolean>): boolean {
  if (!user) return false;
  if (userPermissions && Object.keys(userPermissions).length > 0) {
    if (!hasPermission(userPermissions, "client.edit")) return false;
  }
  const role = getClientRole(user);
  if (role === "CEO" || role === "Managing Director") return true;
  if (role !== "Business Unit Head") return false;
  if (!client) return true;
  return isUserInClientBU(user, client);
}

/**
 * DELIVERY TEAM MANAGEMENT
 */
export function canManageDeliveryTeam(user: Person | null, client: ClientRecord | null, userPermissions?: Record<string, boolean>): boolean {
  if (!user || !client) return false;
  if (userPermissions && Object.keys(userPermissions).length > 0) {
    if (!hasPermission(userPermissions, "client.edit")) return false;
  }
  const role = getClientRole(user);
  return (role === "Team Lead" && client.teamLeadId === user.id) || role === "CEO" || role === "Managing Director";
}

/**
 * CLIENT VISIBILITY
 */
export function canViewClient(user: Person | null, client: ClientRecord | null, userPermissions?: Record<string, boolean>): boolean {
  if (!user || !client) return false;
  if (userPermissions && Object.keys(userPermissions).length > 0) {
    if (!hasPermission(userPermissions, "client.view")) return false;
  }
  const role = getClientRole(user);

  if (role === "CEO" || role === "Managing Director") {
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

export function canOpenClient360(user: Person | null, client: ClientRecord | null, userPermissions?: Record<string, boolean>): boolean {
  return canViewClient(user, client, userPermissions);
}

/**
 * COMMERCIAL / SENSITIVE MASKING
 */
export function canViewCommercialInformation(user: Person | null, userPermissions?: Record<string, boolean>): boolean {
  if (!user) return false;
  if (userPermissions && Object.keys(userPermissions).length > 0) {
    return hasPermission(userPermissions, "client.view");
  }
  const role = getClientRole(user);
  return (
    role === "CEO" ||
    role === "Managing Director" ||
    role === "Business Unit Head" ||
    role === "Finance Head" ||
    role === "Marketing Head"
  );
}

export function canViewSensitiveClientInformation(user: Person | null, userPermissions?: Record<string, boolean>): boolean {
  return canViewCommercialInformation(user, userPermissions);
}
