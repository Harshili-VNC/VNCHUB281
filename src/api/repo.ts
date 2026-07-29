import "@tanstack/react-start/server-only";
// Server-only. Thin data-access layer over Drizzle.

import { eq } from "drizzle-orm";
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
      row.designationLevelId ? (desigLevelNames.get(row.designationLevelId) ?? null) : null,
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
  const [deptNames, desigNames, desigLevelNames] = await Promise.all([
    departmentNameMap(),
    designationNameMap(),
    designationLevelNameMap(),
  ]);
  return toPerson(
    row,
    deptNames.get(row.departmentId) ?? "Unassigned",
    row.designationId ? (desigNames.get(row.designationId) ?? null) : null,
    row.designationLevelId ? (desigLevelNames.get(row.designationLevelId) ?? null) : null,
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
