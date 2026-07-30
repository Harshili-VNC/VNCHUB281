import "@tanstack/react-start/server-only";
// Server-only. Thin data-access layer over Drizzle.

import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/client";
import {
  people,
  tasks,
  leaveRequests,
  credentials,
  departments,
  designations,
  designationLevels,
  clients,
  clientContacts,
  clientAccounts,
  clientSoftwareStacks,
  documents,
  clientChangeRequests,
  employeeHistory,
  importJobs,
  exportJobs,
  employeeLearningPaths,
  employeeCourses,
  employeeCareerPaths,
  employeeKraGoals,
  employeeAppraisals,
  employeeRecognitions,
  employeeAssets,
  employeePersonalAssets,
  employeePolicies,
  employeeAttendanceSummaries,
  employeeLeaveSummaries,
  employeeDocuments,
  employeeProjectHistory,
  employeeCompensationHistory,
  clientHistory,
  permissions,
  designationPermissions,
  permissionAuditLogs,
  userNotifications,
} from "../db/schema";
import {
  toPerson,
  toTask,
  toLeaveRequest,
  toClient,
  toClientContact,
  toClientAccount,
  toClientSoftwareStack,
  toDocument,
  toClientChangeRequest,
  toEmployeeHistory,
  toImportJob,
  toExportJob,
  toEmployeeLearningPath,
  toEmployeeCourse,
  toEmployeeCareerPath,
  toEmployeeKraGoal,
  toEmployeeAppraisal,
  toEmployeeRecognition,
  toEmployeeAsset,
  toEmployeePersonalAsset,
  toEmployeePolicy,
  toEmployeeAttendanceSummary,
  toEmployeeLeaveSummary,
  toEmployeeDocument,
  toEmployeeProjectHistory,
  toEmployeeCompensationHistory,
  toClientHistory,
  generateId,
} from "./mappers";
import type { Person } from "../lib/hierarchy";

type DepartmentRow = typeof departments.$inferSelect;
type PersonRow = typeof people.$inferSelect;

async function departmentNameMap(): Promise<Map<string, string>> {
  const rows = await db.select().from(departments);
  return new Map(rows.map((d: DepartmentRow) => [d.id, d.name]));
}

async function designationNameMap(): Promise<Map<string, string>> {
  const rows = await db.select().from(designations);
  return new Map(rows.map((d) => [d.id, d.name]));
}

async function designationLevelNameMap(): Promise<Map<string, string>> {
  const rows = await db.select().from(designationLevels);
  return new Map(rows.map((d) => [d.id, d.name]));
}

export async function loadPeople(): Promise<Person[]> {
  const [rows, deptNames, desigNames, desigLevelNames] = await Promise.all([
    db.select().from(people),
    departmentNameMap(),
    designationNameMap(),
    designationLevelNameMap(),
  ]);
  return rows.map((row: PersonRow) =>
    toPerson(
      row,
      deptNames.get(row.departmentId) ?? "Unassigned",
      row.designationId ? (desigNames.get(row.designationId) ?? null) : null,
    ),
  );
}

export async function loadTasks() {
  const rows = await db.select().from(tasks);
  return rows.map(toTask);
}

export async function loadLeaveRequests() {
  const rows = await db.select().from(leaveRequests);
  return rows.map(toLeaveRequest);
}

export async function findPersonById(id: string): Promise<Person | null> {
  const [row] = await db.select().from(people).where(eq(people.id, id)).limit(1);
  if (!row) return null;
  const [deptNames, desigNames] = await Promise.all([
    departmentNameMap(),
    designationNameMap(),
  ]);
  return toPerson(
    row,
    deptNames.get(row.departmentId) ?? "Unassigned",
    row.designationId ? (desigNames.get(row.designationId) ?? null) : null,
  );
}

export async function findCredentialByEmail(email: string) {
  const [row] = await db.select().from(credentials).where(eq(credentials.email, email)).limit(1);
  return row ?? null;
}

export async function emailExists(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  const [personRow] = await db
    .select({ id: people.id })
    .from(people)
    .where(eq(people.email, normalized))
    .limit(1);
  if (personRow) return true;
  const [credRow] = await db
    .select({ email: credentials.email })
    .from(credentials)
    .where(eq(credentials.email, normalized))
    .limit(1);
  return Boolean(credRow);
}

export async function findOrCreateDepartment(name: string): Promise<string> {
  const trimmed = name.trim() || "Unassigned";
  const [existing] = await db
    .select()
    .from(departments)
    .where(eq(departments.name, trimmed))
    .limit(1);
  if (existing) return existing.id;
  const id = generateId("dept");
  await db
    .insert(departments)
    .values({ id, name: trimmed })
    .onConflictDoNothing({ target: departments.name });
  const [row] = await db.select().from(departments).where(eq(departments.name, trimmed)).limit(1);
  return row?.id ?? id;
}

export async function findOrCreateDesignation(name: string): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const [existing] = await db
    .select()
    .from(designations)
    .where(eq(designations.name, trimmed))
    .limit(1);
  if (existing) return existing.id;
  const id = generateId("desig");
  await db
    .insert(designations)
    .values({ id, name: trimmed })
    .onConflictDoNothing({ target: designations.name });
  const [row] = await db.select().from(designations).where(eq(designations.name, trimmed)).limit(1);
  return row?.id ?? id;
}

export async function findOrCreateDesignationLevel(name: string): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const [existing] = await db
    .select()
    .from(designationLevels)
    .where(eq(designationLevels.name, trimmed))
    .limit(1);
  if (existing) return existing.id;
  const id = generateId("desiglvl");
  const maxRankRows = await db.select({ rank: designationLevels.rank }).from(designationLevels);
  const nextRank = maxRankRows.reduce((max, r) => Math.max(max, r.rank), 0) + 1;
  await db
    .insert(designationLevels)
    .values({ id, name: trimmed, rank: nextRank })
    .onConflictDoNothing({ target: designationLevels.name });
  const [row] = await db
    .select()
    .from(designationLevels)
    .where(eq(designationLevels.name, trimmed))
    .limit(1);
  return row?.id ?? id;
}

export async function countPeople(): Promise<number> {
  const rows = await db.select({ id: people.id }).from(people);
  return rows.length;
}

export async function findOrCreateClient(name: string): Promise<string> {
  const trimmed = name.trim();
  const [existing] = await db.select().from(clients).where(eq(clients.name, trimmed)).limit(1);
  if (existing) return existing.id;
  const id = generateId("client");
  await db
    .insert(clients)
    .values({ id, name: trimmed })
    .onConflictDoNothing({ target: clients.name });
  const [row] = await db.select().from(clients).where(eq(clients.name, trimmed)).limit(1);
  return row?.id ?? id;
}

export async function loadClients() {
  const rows = await db.select().from(clients);
  return rows.map(toClient);
}

export async function findClientById(id: string) {
  const [row] = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return row ? toClient(row) : null;
}

export async function findClientByCode(code: string) {
  const [row] = await db.select().from(clients).where(eq(clients.code, code)).limit(1);
  return row ? toClient(row) : null;
}

export async function countClients(): Promise<number> {
  const rows = await db.select({ id: clients.id }).from(clients);
  return rows.length;
}

export async function loadClientContacts(clientId: string) {
  const rows = await db.select().from(clientContacts).where(eq(clientContacts.clientId, clientId));
  return rows.map(toClientContact);
}

export async function loadClientAccounts(clientId: string) {
  const rows = await db.select().from(clientAccounts).where(eq(clientAccounts.clientId, clientId));
  return rows.map(toClientAccount);
}

export async function loadClientSoftwareStacks(clientId: string) {
  const rows = await db
    .select()
    .from(clientSoftwareStacks)
    .where(eq(clientSoftwareStacks.clientId, clientId));
  return rows.map(toClientSoftwareStack);
}

export async function loadClientChangeRequests() {
  const rows = await db.select().from(clientChangeRequests);
  return rows.map(toClientChangeRequest);
}

export async function loadEmployeeHistory() {
  const rows = await db.select().from(employeeHistory);
  return rows.map(toEmployeeHistory);
}

export async function loadImportJobs() {
  const rows = await db.select().from(importJobs);
  return rows.map(toImportJob);
}

export async function loadExportJobs() {
  const rows = await db.select().from(exportJobs);
  return rows.map(toExportJob);
}

export async function loadDocuments() {
  const rows = await db.select().from(documents);
  return rows.map(toDocument);
}

export async function findDocumentRowById(id: string) {
  const [row] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  return row ?? null;
}

// --- Employee sub-module loaders ---

export async function loadEmployeeLearningPaths(personId: string) {
  const rows = await db
    .select()
    .from(employeeLearningPaths)
    .where(eq(employeeLearningPaths.personId, personId));
  return rows.map(toEmployeeLearningPath);
}

export async function loadEmployeeCourses(personId: string) {
  const rows = await db
    .select()
    .from(employeeCourses)
    .where(eq(employeeCourses.personId, personId));
  return rows.map(toEmployeeCourse);
}

export async function loadEmployeeCareerPaths(personId: string) {
  const rows = await db
    .select()
    .from(employeeCareerPaths)
    .where(eq(employeeCareerPaths.personId, personId));
  return rows.map(toEmployeeCareerPath);
}

export async function loadEmployeeKraGoals(personId: string) {
  const rows = await db
    .select()
    .from(employeeKraGoals)
    .where(eq(employeeKraGoals.personId, personId));
  return rows.map(toEmployeeKraGoal);
}

export async function loadEmployeeAppraisals(personId: string) {
  const rows = await db
    .select()
    .from(employeeAppraisals)
    .where(eq(employeeAppraisals.personId, personId));
  return rows.map(toEmployeeAppraisal);
}

export async function loadEmployeeRecognitions(personId: string) {
  const rows = await db
    .select()
    .from(employeeRecognitions)
    .where(eq(employeeRecognitions.personId, personId));
  return rows.map(toEmployeeRecognition);
}

export async function loadEmployeeAssets(personId: string) {
  const rows = await db.select().from(employeeAssets).where(eq(employeeAssets.personId, personId));
  return rows.map(toEmployeeAsset);
}

export async function loadEmployeePersonalAssets(personId: string) {
  const rows = await db
    .select()
    .from(employeePersonalAssets)
    .where(eq(employeePersonalAssets.personId, personId));
  return rows.map(toEmployeePersonalAsset);
}

export async function loadEmployeePolicy(personId: string) {
  const [row] = await db
    .select()
    .from(employeePolicies)
    .where(eq(employeePolicies.personId, personId))
    .limit(1);
  return row ? toEmployeePolicy(row) : null;
}

export async function loadEmployeeAttendanceSummaries(personId: string) {
  const rows = await db
    .select()
    .from(employeeAttendanceSummaries)
    .where(eq(employeeAttendanceSummaries.personId, personId));
  return rows.map(toEmployeeAttendanceSummary);
}

export async function loadEmployeeLeaveSummaries(personId: string) {
  const rows = await db
    .select()
    .from(employeeLeaveSummaries)
    .where(eq(employeeLeaveSummaries.personId, personId));
  return rows.map(toEmployeeLeaveSummary);
}

export async function loadEmployeeHrDocuments(personId: string) {
  const rows = await db
    .select()
    .from(employeeDocuments)
    .where(eq(employeeDocuments.personId, personId));
  return rows.map(toEmployeeDocument);
}

export async function loadEmployeeProjectHistory(personId: string) {
  const rows = await db
    .select()
    .from(employeeProjectHistory)
    .where(eq(employeeProjectHistory.personId, personId));
  return rows.map(toEmployeeProjectHistory);
}

export async function loadEmployeeCompensationHistory(personId: string) {
  const rows = await db
    .select()
    .from(employeeCompensationHistory)
    .where(eq(employeeCompensationHistory.personId, personId));
  return rows.map(toEmployeeCompensationHistory);
}

export async function loadClientHistory(clientId: string) {
  const rows = await db.select().from(clientHistory).where(eq(clientHistory.clientId, clientId));
  return rows.sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime()).map(toClientHistory);
}

// ---------------------------------------------------------------------------
// Enterprise Permission Data Access (Server-Only)
// ---------------------------------------------------------------------------

import { ALL_PERMISSIONS, getDefaultPermissionsForDesignation } from "../lib/permissions";

export async function loadUserPermissionsMap(
  designationId: string | null | undefined,
  designationName?: string | null
): Promise<Record<string, boolean>> {
  try {
    // 1. Direct query by designationId if provided
    if (designationId) {
      const rows = await db
        .select()
        .from(designationPermissions)
        .where(eq(designationPermissions.designationId, designationId));

      if (rows.length > 0) {
        const map: Record<string, boolean> = {};
        for (const r of rows) {
          map[r.permissionId] = r.isEnabled;
        }
        return map;
      }
    }

    // 2. Query designations table to resolve ID by designationName / designationId string
    const targetSearch = designationName || designationId;
    if (targetSearch) {
      const allDesigs = await db.select().from(designations);
      const matchedDesig = allDesigs.find(
        (d) =>
          d.id === designationId ||
          d.name.toLowerCase() === targetSearch.toLowerCase()
      );

      if (matchedDesig) {
        const rows = await db
          .select()
          .from(designationPermissions)
          .where(eq(designationPermissions.designationId, matchedDesig.id));

        if (rows.length > 0) {
          const map: Record<string, boolean> = {};
          for (const r of rows) {
            map[r.permissionId] = r.isEnabled;
          }
          return map;
        }
      }
    }

    // 3. Fallback to default system permissions for designation name
    return getDefaultPermissionsForDesignation(designationName || designationId || "Employee");
  } catch (err) {
    console.error("Failed to load user permissions map:", err);
    return getDefaultPermissionsForDesignation(designationName || designationId || "Employee");
  }
}

export async function loadPermissionMatrixData() {
  const desigList = await db.select().from(designations);
  const rawDP = await db.select().from(designationPermissions);

  const matrix: Record<string, Record<string, boolean>> = {};

  for (const d of desigList) {
    matrix[d.id] = getDefaultPermissionsForDesignation(d.name || d.id);
  }

  for (const row of rawDP) {
    if (!matrix[row.designationId]) {
      matrix[row.designationId] = {};
    }
    matrix[row.designationId][row.permissionId] = row.isEnabled;
  }

  return {
    designations: desigList,
    permissions: ALL_PERMISSIONS,
    matrix,
  };
}

export async function loadPermissionAuditLogsList() {
  const logs = await db
    .select()
    .from(permissionAuditLogs)
    .orderBy(desc(permissionAuditLogs.changedAt))
    .limit(100);

  return logs;
}

export async function savePermissionChangesInRepo(
  userId: string,
  userName: string,
  changes: Array<{ designationId: string; permissionId: string; isEnabled: boolean }>
) {
  const desigList = await db.select().from(designations);
  const desigMap = new Map(desigList.map((d) => [d.id, d.name]));
  const permMap = new Map(ALL_PERMISSIONS.map((p) => [p.id, p.name]));

  // Lockout prevention check
  const adminDesigs = desigList.filter(
    (d) =>
      d.name.toLowerCase().includes("admin") ||
      d.name.toLowerCase().includes("ceo") ||
      d.name.toLowerCase().includes("managing director")
  );

  for (const change of changes) {
    if (change.permissionId === "system.manage_permissions" && !change.isEnabled) {
      const desigName = desigMap.get(change.designationId)?.toLowerCase() || "";
      const isAdminRole = desigName.includes("admin") || desigName.includes("ceo") || desigName.includes("managing director");

      if (isAdminRole) {
        const otherAdmins = adminDesigs.filter((d) => d.id !== change.designationId);
        let remainingAdmins = 0;

        for (const other of otherAdmins) {
          const existing = await db
            .select()
            .from(designationPermissions)
            .where(
              and(
                eq(designationPermissions.designationId, other.id),
                eq(designationPermissions.permissionId, "system.manage_permissions")
              )
            );
          if (existing.length === 0 || existing[0].isEnabled) {
            remainingAdmins++;
          }
        }

        if (remainingAdmins === 0) {
          throw new Error(
            "Security Lockout Rejected: Cannot remove 'Manage Permissions' from the last active Administrator role."
          );
        }
      }
    }
  }

  let savedCount = 0;
  const changesByDesig = new Map<string, Array<{ permissionId: string; permissionName: string; isEnabled: boolean; previousValue: boolean }>>();

  for (const change of changes) {
    const existing = await db
      .select()
      .from(designationPermissions)
      .where(
        and(
          eq(designationPermissions.designationId, change.designationId),
          eq(designationPermissions.permissionId, change.permissionId)
        )
      );

    const previousValue = existing.length > 0 ? existing[0].isEnabled : (getDefaultPermissionsForDesignation(change.designationId)[change.permissionId] ?? false);

    if (previousValue === change.isEnabled) {
      continue;
    }

    const desigName = desigMap.get(change.designationId) || change.designationId;
    const permName = permMap.get(change.permissionId) || change.permissionId;

    if (existing.length > 0) {
      await db
        .update(designationPermissions)
        .set({ isEnabled: change.isEnabled, updatedAt: new Date() })
        .where(eq(designationPermissions.id, existing[0].id));
    } else {
      await db.insert(designationPermissions).values({
        id: `dp-${change.designationId}-${change.permissionId}`,
        designationId: change.designationId,
        permissionId: change.permissionId,
        isEnabled: change.isEnabled,
      });
    }

    await db.insert(permissionAuditLogs).values({
      id: generateId("p-audit"),
      changedBy: userId,
      changedByName: userName,
      designationId: change.designationId,
      designationName: desigName,
      permissionId: change.permissionId,
      permissionName: permName,
      previousValue,
      newValue: change.isEnabled,
    });

    if (!changesByDesig.has(change.designationId)) {
      changesByDesig.set(change.designationId, []);
    }
    changesByDesig.get(change.designationId)!.push({
      permissionId: change.permissionId,
      permissionName: permName,
      isEnabled: change.isEnabled,
      previousValue,
    });

    savedCount++;
  }

  // Generate In-App Permission Change Notifications for Affected Active Employees
  if (savedCount > 0) {
    const allPeopleRows = await db.select().from(people).where(eq(people.status, "active"));

    for (const [desigId, desigChanges] of changesByDesig.entries()) {
      const desigName = desigMap.get(desigId) || desigId;
      const affectedEmployees = allPeopleRows.filter(
        (p) => p.designationId === desigId
      );

      if (affectedEmployees.length === 0) continue;

      let title = "Permission Updated";
      let message = "Your system permissions have been updated.";
      let status = "info";
      let detailsJson: string | null = null;

      if (desigChanges.length === 1) {
        const item = desigChanges[0];
        if (item.isEnabled) {
          title = "Permission Updated";
          message = `Your permission to ${item.permissionName} has been enabled by the system administrator.`;
          status = "success";
        } else {
          title = "Permission Updated";
          message = `Your permission to ${item.permissionName} has been removed by the system administrator.`;
          status = "warning";
        }
      } else {
        title = "Permissions Updated";
        message = "Your system permissions have been updated. Click to view changes.";
        const details = desigChanges.map((c) =>
          c.isEnabled ? `✓ ${c.permissionName} Enabled` : `✕ ${c.permissionName} Disabled`
        );
        detailsJson = JSON.stringify(details);

        const allEnabled = desigChanges.every((c) => c.isEnabled);
        const allDisabled = desigChanges.every((c) => !c.isEnabled);
        if (allEnabled) status = "success";
        else if (allDisabled) status = "warning";
        else status = "info"; // Neutral Blue for mixed state
      }

      // Batch insert ONE notification per affected employee
      for (const emp of affectedEmployees) {
        await db.insert(userNotifications).values({
          id: generateId("notif"),
          personId: emp.id,
          title,
          message,
          type: "permission_update",
          status,
          detailsJson,
          isRead: false,
        });
      }
    }
  }

  return savedCount;
}

export async function loadUserNotifications(personId: string) {
  const rows = await db
    .select()
    .from(userNotifications)
    .where(eq(userNotifications.personId, personId))
    .orderBy(desc(userNotifications.createdAt))
    .limit(50);

  return rows;
}

export async function markUserNotificationsRead(personId: string, notificationId?: string) {
  if (notificationId) {
    await db
      .update(userNotifications)
      .set({ isRead: true })
      .where(and(eq(userNotifications.id, notificationId), eq(userNotifications.personId, personId)));
  } else {
    await db
      .update(userNotifications)
      .set({ isRead: true })
      .where(and(eq(userNotifications.personId, personId), eq(userNotifications.isRead, false)));
  }
}

export async function resetPermissionDefaultsInRepo(userId: string, userName: string, designationId?: string) {
  const desigList = await db.select().from(designations);
  const targetDesigs = designationId
    ? desigList.filter((d) => d.id === designationId)
    : desigList;

  let resetCount = 0;

  for (const desig of targetDesigs) {
    const defaults = getDefaultPermissionsForDesignation(desig.name || desig.id);
    for (const p of ALL_PERMISSIONS) {
      const defaultVal = defaults[p.id] ?? false;

      const existing = await db
        .select()
        .from(designationPermissions)
        .where(
          and(
            eq(designationPermissions.designationId, desig.id),
            eq(designationPermissions.permissionId, p.id)
          )
        );

      const currentVal = existing.length > 0 ? existing[0].isEnabled : false;
      if (currentVal !== defaultVal) {
        if (existing.length > 0) {
          await db
            .update(designationPermissions)
            .set({ isEnabled: defaultVal, updatedAt: new Date() })
            .where(eq(designationPermissions.id, existing[0].id));
        } else {
          await db.insert(designationPermissions).values({
            id: `dp-${desig.id}-${p.id}`,
            designationId: desig.id,
            permissionId: p.id,
            isEnabled: defaultVal,
          });
        }

        await db.insert(permissionAuditLogs).values({
          id: generateId("p-audit"),
          changedBy: userId,
          changedByName: userName,
          designationId: desig.id,
          designationName: desig.name,
          permissionId: p.id,
          permissionName: p.name,
          previousValue: currentVal,
          newValue: defaultVal,
        });

        resetCount++;
      }
    }
  }

  return resetCount;
}

