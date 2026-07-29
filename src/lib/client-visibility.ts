import type { Person } from "./hierarchy";
import type { ClientRecord } from "./documents";
import {
  getClientRole,
  canCreateClient as _canCreateClient,
  canEditClient as _canEditClient,
  canEditCompanyInformation as _canEditCompanyInformation,
  canSubmitClient as _canSubmitClient,
  canApproveClient as _canApproveClient,
  canAssignTeamLead as _canAssignTeamLead,
  canManageDeliveryTeam as _canManageDeliveryTeam,
  canViewClient as _canViewClient,
  canViewCommercialInformation as _canViewCommercialInformation,
  isUserInClientBU,
  canRaiseChangeRequest as _canRaiseChangeRequest,
  canApproveChangeRequest as _canApproveChangeRequest,
  canRejectClient as _canRejectClient,
  canSendBackClient as _canSendBackClient,
  canOpenClient360 as _canOpenClient360,
  isClientSuperUser as _isClientSuperUser,
} from "./client-permissions";

export { isUserInClientBU, getClientRole };

export function isSuperUser(user: Person | null): boolean {
  return _isClientSuperUser(user);
}

export function isBUHead(user: Person | null): boolean {
  return getClientRole(user) === "Business Unit Head";
}

export function isFinanceOrMarketingHead(user: Person | null): boolean {
  const role = getClientRole(user);
  return role === "Finance Head" || role === "Marketing Head";
}

export function canCreateClient(user: Person | null): boolean {
  return _canCreateClient(user);
}

export function canEditClient(user: Person | null, client: ClientRecord | null): boolean {
  return _canEditClient(user, client);
}

export function canEditCompanyInfo(user: Person | null, client: ClientRecord | null): boolean {
  return _canEditCompanyInformation(user, client);
}

export function canSubmitClient(user: Person | null, client: ClientRecord | null): boolean {
  return _canSubmitClient(user, client);
}

export function canApproveClient(user: Person | null, client?: ClientRecord | null): boolean {
  return _canApproveClient(user, client ?? null);
}

export function canRejectClient(user: Person | null, client?: ClientRecord | null): boolean {
  return _canRejectClient(user, client ?? null);
}

export function canSendBackClient(user: Person | null, client?: ClientRecord | null): boolean {
  return _canSendBackClient(user, client ?? null);
}

export function canViewClient(user: Person | null, client: ClientRecord | null): boolean {
  return _canViewClient(user, client);
}

export function canOpenClient360(user: Person | null, client: ClientRecord | null): boolean {
  return _canOpenClient360(user, client);
}

export function canManageTeam(user: Person | null, client: ClientRecord | null): boolean {
  return _canAssignTeamLead(user, client) || _canManageDeliveryTeam(user, client);
}

export function canAssignTeamLead(user: Person | null, client: ClientRecord | null): boolean {
  return _canAssignTeamLead(user, client);
}

export function canManageDeliveryTeam(user: Person | null, client: ClientRecord | null): boolean {
  return _canManageDeliveryTeam(user, client);
}

export function canManageClientMaster(user: Person | null): boolean {
  const role = getClientRole(user);
  return role === "Finance Head" || role === "Marketing Head" || role === "Business Unit Head";
}

export function canViewSensitiveClientData(user: Person | null): boolean {
  return _canViewCommercialInformation(user);
}

export function filterClientsByRole(clients: ClientRecord[], user: Person | null): ClientRecord[] {
  if (!user) return [];
  return clients.filter((c) => _canViewClient(user, c));
}

export function canRaiseChangeRequest(user: Person | null, client: ClientRecord | null): boolean {
  return _canRaiseChangeRequest(user, client);
}

export function canApproveChangeRequest(user: Person | null, client: ClientRecord | null): boolean {
  return _canApproveChangeRequest(user, client);
}
