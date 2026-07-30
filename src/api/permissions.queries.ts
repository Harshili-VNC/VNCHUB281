import { createServerFn } from "@tanstack/react-start";
import { getSessionPersonId } from "./session";
import { findPersonById, loadPermissionMatrixData, loadPermissionAuditLogsList, loadUserPermissionsMap } from "./repo";

async function requireCurrentUser() {
  const personId = await getSessionPersonId();
  if (!personId) return null;
  const person = await findPersonById(personId);
  return person && person.status === "active" ? person : null;
}

export const getPermissionMatrixFn = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireCurrentUser();
  if (!user) {
    throw new Error("Unauthorized: Active session required.");
  }

  const { designations, permissions, matrix } = await loadPermissionMatrixData();
  const currentUserPermissions = await loadUserPermissionsMap(user.designationId, user.designationId);

  return {
    designations,
    permissions,
    matrix,
    currentUserPermissions,
  };
});

export const getPermissionAuditLogsFn = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireCurrentUser();
  if (!user) {
    throw new Error("Unauthorized: Active session required.");
  }

  const logs = await loadPermissionAuditLogsList();
  return { logs };
});
