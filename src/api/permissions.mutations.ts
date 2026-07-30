import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSessionPersonId } from "./session";
import { findPersonById, savePermissionChangesInRepo, resetPermissionDefaultsInRepo } from "./repo";

async function requireCurrentUser() {
  const personId = await getSessionPersonId();
  if (!personId) return null;
  const person = await findPersonById(personId);
  return person && person.status === "active" ? person : null;
}

function isAuthorizedToManagePermissions(user: { designation?: string | null; departmentFunction?: string | null }) {
  const desig = (user.designation || "").toLowerCase();
  const deptFunc = (user.departmentFunction || "").toLowerCase();
  return desig.includes("admin") || deptFunc === "admin";
}

const permissionChangeSchema = z.object({
  designationId: z.string().min(1),
  permissionId: z.string().min(1),
  isEnabled: z.boolean(),
});

export const savePermissionsFn = createServerFn({ method: "POST" })
  .validator(z.object({ changes: z.array(permissionChangeSchema) }))
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) {
      throw new Error("Unauthorized: Active user session required.");
    }

    if (!isAuthorizedToManagePermissions(user)) {
      throw new Error("Forbidden: Only Administrators and Executive Leadership can manage enterprise permissions.");
    }

    const { changes } = data;
    if (changes.length === 0) {
      return { success: true, count: 0 };
    }

    const userName = `${user.firstName} ${user.lastName}`.trim();
    const savedCount = await savePermissionChangesInRepo(user.id, userName, changes);

    return { success: true, count: savedCount };
  });

export const resetPermissionsFn = createServerFn({ method: "POST" })
  .validator(z.object({ designationId: z.string().optional() }))
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user || !isAuthorizedToManagePermissions(user)) {
      throw new Error("Unauthorized: Admin privilege required.");
    }

    const userName = `${user.firstName} ${user.lastName}`.trim();
    const resetCount = await resetPermissionDefaultsInRepo(user.id, userName, data.designationId);

    return { success: true, count: resetCount };
  });

export const clonePermissionsFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      sourceDesignationId: z.string().min(1),
      targetDesignationId: z.string().min(1),
    })
  )
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user || !isAuthorizedToManagePermissions(user)) {
      throw new Error("Unauthorized: Admin privilege required.");
    }

    const { sourceDesignationId, targetDesignationId } = data;
    if (sourceDesignationId === targetDesignationId) {
      throw new Error("Source and target designations must be different.");
    }

    // Delegate clone to server function savePermissionsFn
    const { matrix } = await (await import("./repo")).loadPermissionMatrixData();
    const sourcePermissionsMap = matrix[sourceDesignationId] || {};

    const ALL_PERMS = (await import("../lib/permissions")).ALL_PERMISSIONS;
    const changes = ALL_PERMS.map((p) => ({
      designationId: targetDesignationId,
      permissionId: p.id,
      isEnabled: sourcePermissionsMap[p.id] ?? false,
    }));

    const userName = `${user.firstName} ${user.lastName}`.trim();
    const savedCount = await savePermissionChangesInRepo(user.id, userName, changes);

    return { success: true, count: savedCount };
  });

export const markNotificationsReadFn = createServerFn({ method: "POST" })
  .validator(z.object({ notificationId: z.string().optional() }))
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { success: false };

    const { markUserNotificationsRead } = await import("./repo");
    await markUserNotificationsRead(user.id, data.notificationId);

    return { success: true };
  });
