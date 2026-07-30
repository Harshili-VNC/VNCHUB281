import { createServerFn } from "@tanstack/react-start";
import { getSessionPersonId } from "./session";
import { findPersonById, loadPermissionMatrixData, loadPermissionAuditLogsList, loadUserPermissionsMap } from "./repo";

async function requireCurrentUser() {
  const personId = await getSessionPersonId();
  if (!personId) return null;
  const person = await findPersonById(personId);
  return person && person.status === "active" ? person : null;
}

function isAdminUser(user: { designation?: string | null; departmentFunction?: string | null }) {
  const desig = (user.designation || "").toLowerCase();
  const deptFunc = (user.departmentFunction || "").toLowerCase();
  return desig.includes("admin") || deptFunc === "admin";
}

export const getPermissionMatrixFn = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireCurrentUser();
  if (!user) {
    throw new Error("Unauthorized: Active session required.");
  }
  if (!isAdminUser(user)) {
    throw new Error("403 Forbidden: Permission Management is restricted to Administrators only.");
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
  if (!isAdminUser(user)) {
    throw new Error("403 Forbidden: Permission Management is restricted to Administrators only.");
  }

  const logs = await loadPermissionAuditLogsList();
  return { logs };
});
