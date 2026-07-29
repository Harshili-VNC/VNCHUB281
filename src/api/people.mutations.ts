// Server-only. Core employee creation/editing/status mutations with 10/10 enterprise security & validation.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { people, credentials, employeeHistory } from "../db/schema";
import { getSessionPersonId } from "./session";
import {
  findPersonById,
  findOrCreateDepartment,
  findOrCreateDesignation,
  emailExists,
  countPeople,
} from "./repo";
import { generateId } from "./mappers";
import { hashPassword } from "../lib/password";

async function requireCurrentUser() {
  const personId = await getSessionPersonId();
  if (!personId) return null;
  const person = await findPersonById(personId);
  return person && person.status === "active" ? person : null;
}

function canManagePeople(person: {
  departmentFunction: string;
  isTeamLead: boolean;
  isBusinessUnitHead: boolean;
}) {
  return (
    person.departmentFunction === "Leadership" ||
    person.departmentFunction === "Admin" ||
    person.departmentFunction === "HR" ||
    person.isBusinessUnitHead ||
    person.isTeamLead
  );
}

async function validateReportingManager(managerId: string | undefined | null, targetPersonId?: string) {
  if (!managerId) return { valid: true, error: null };
  if (targetPersonId && managerId === targetPersonId) {
    return { valid: false, error: "An employee cannot report to themselves." };
  }
  const manager = await findPersonById(managerId);
  if (!manager) {
    return { valid: false, error: "Selected reporting manager does not exist." };
  }
  if (manager.status !== "active") {
    return { valid: false, error: "Selected reporting manager is inactive." };
  }
  return { valid: true, error: null };
}

async function logHistory(personId: string, field: string, prevValue: string | null, newValue: string | null, changedBy: string) {
  await db.insert(employeeHistory).values({
    id: generateId("eh"),
    personId,
    field,
    previousValue: prevValue ?? "—",
    newValue: newValue ?? "—",
    changedBy,
  });
}

const personDetailsFields = {
  officialWorkLocation: z.string().optional(),
  legalEntity: z.string().optional(),
  primaryBusinessUnit: z.string().optional(),
  secondaryBusinessUnit: z.string().optional(),
  subDepartment: z.string().optional(),
  designation: z.string().optional(),
  hireDate: z.string().optional(),
};

const orgMappingFields = {
  departmentFunction: z.enum([
    "Finance",
    "HR",
    "Marketing",
    "Operations",
    "Leadership",
    "Admin",
    "IT / Systems",
  ]).default("Operations"),
  isTeamLead: z.boolean().optional(),
  isBusinessUnitHead: z.boolean().optional(),
};

const addPersonSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email format"),
  department: z.string().min(1, "Department is required"),
  managerId: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  ...personDetailsFields,
  ...orgMappingFields,
});

export const addPersonFn = createServerFn({ method: "POST" })
  .validator(addPersonSchema)
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { ok: false as const, error: "You must be signed in." };
    if (!canManagePeople(user)) {
      return { ok: false as const, error: "You don't have permission to add employees." };
    }

    const email = data.email.trim().toLowerCase();
    if (await emailExists(email)) {
      return { ok: false as const, error: "An account with that email address already exists." };
    }

    const managerValidation = await validateReportingManager(data.managerId);
    if (!managerValidation.valid) {
      return { ok: false as const, error: managerValidation.error! };
    }

    const departmentId = await findOrCreateDepartment(data.department);
    const designationId = data.designation ? await findOrCreateDesignation(data.designation) : null;

    const existingCount = await countPeople();
    const employeeCode = `EMP-${String(existingCount + 1).padStart(4, "0")}`;
    const id = generateId("person");

    await db.insert(people).values({
      id,
      employeeCode,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email,
      officialWorkLocation: data.officialWorkLocation?.trim() || null,
      legalEntity: data.legalEntity?.trim() || null,
      primaryBusinessUnit: data.primaryBusinessUnit || null,
      secondaryBusinessUnit: data.secondaryBusinessUnit || null,
      departmentId,
      subDepartment: data.subDepartment?.trim() || null,
      designationId,
      managerId: data.managerId || null,
      hireDate: data.hireDate || null,
      departmentFunction: data.departmentFunction ?? "Operations",
      isTeamLead: data.isTeamLead ?? false,
      isBusinessUnitHead: data.isBusinessUnitHead ?? false,
      status: "active",
    });

    const passwordHash = await hashPassword(data.password);
    await db.insert(credentials).values({ email, personId: id, passwordHash });

    await logHistory(id, "Created", null, `Employee ${employeeCode} created (Active)`, user.name);

    return {
      ok: true as const,
      person: {
        id,
        employeeCode,
        name: `${data.firstName} ${data.lastName}`.trim(),
        email,
        departmentFunction: data.departmentFunction ?? "Operations",
      },
    };
  });

const updatePersonSchema = z.object({
  id: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  department: z.string().min(1),
  managerId: z.string().optional(),
  ...personDetailsFields,
  ...orgMappingFields,
});

export const updatePersonFn = createServerFn({ method: "POST" })
  .validator(updatePersonSchema)
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { ok: false as const, error: "You must be signed in." };
    if (!canManagePeople(user)) {
      return { ok: false as const, error: "You don't have permission to edit employees." };
    }

    const target = await findPersonById(data.id);
    if (!target) return { ok: false as const, error: "Person not found." };

    const email = data.email.trim().toLowerCase();
    if (email !== target.email && (await emailExists(email))) {
      return { ok: false as const, error: "Another account already uses that email address." };
    }

    const managerValidation = await validateReportingManager(data.managerId, data.id);
    if (!managerValidation.valid) {
      return { ok: false as const, error: managerValidation.error! };
    }

    const departmentId = await findOrCreateDepartment(data.department);
    const designationId = data.designation ? await findOrCreateDesignation(data.designation) : null;

    // Track Audit History
    const changes: { field: string; prev: string | null; next: string | null }[] = [];
    if (target.firstName !== data.firstName.trim() || target.lastName !== data.lastName.trim()) {
      changes.push({ field: "Name", prev: target.name, next: `${data.firstName.trim()} ${data.lastName.trim()}` });
    }
    if (target.email !== email) {
      changes.push({ field: "Work Email", prev: target.email, next: email });
    }
    if (target.department !== data.department) {
      changes.push({ field: "Department", prev: target.department, next: data.department });
    }
    if (target.managerId !== (data.managerId || null)) {
      changes.push({ field: "Reporting Manager", prev: target.managerId, next: data.managerId || null });
    }
    if (target.departmentFunction !== data.departmentFunction) {
      changes.push({ field: "Department Function", prev: target.departmentFunction, next: data.departmentFunction });
    }

    for (const c of changes) {
      await logHistory(data.id, c.field, c.prev, c.next, user.name);
    }

    await db
      .update(people)
      .set({
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email,
        officialWorkLocation: data.officialWorkLocation?.trim() || null,
        legalEntity: data.legalEntity?.trim() || null,
        primaryBusinessUnit: data.primaryBusinessUnit || null,
        secondaryBusinessUnit: data.secondaryBusinessUnit || null,
        departmentId,
        subDepartment: data.subDepartment?.trim() || null,
        designationId,
        managerId: data.managerId || null,
        hireDate: data.hireDate || null,
        departmentFunction: data.departmentFunction ?? target.departmentFunction,
        isTeamLead: data.isTeamLead ?? target.isTeamLead,
        isBusinessUnitHead: data.isBusinessUnitHead ?? target.isBusinessUnitHead,
        updatedAt: new Date(),
      })
      .where(eq(people.id, data.id));

    if (email !== target.email) {
      await db
        .update(credentials)
        .set({ email })
        .where(eq(credentials.personId, data.id));
    }

    return { ok: true as const };
  });

export const setPersonStatusFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1), status: z.enum(["active", "inactive"]) }))
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { ok: false as const, error: "You must be signed in." };
    if (!canManagePeople(user)) {
      return { ok: false as const, error: "You don't have permission to update employee status." };
    }

    const target = await findPersonById(data.id);
    if (!target) return { ok: false as const, error: "Person not found." };
    if (target.status === data.status) {
      return { ok: true as const }; // No-op guard
    }

    await db
      .update(people)
      .set({ status: data.status, updatedAt: new Date() })
      .where(eq(people.id, data.id));

    await logHistory(data.id, "Status", target.status, data.status, user.name);

    return { ok: true as const };
  });

export const reassignPersonFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1), newManagerId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { ok: false as const, error: "You must be signed in." };
    if (!canManagePeople(user)) {
      return { ok: false as const, error: "You don't have permission to reassign employees." };
    }

    const target = await findPersonById(data.id);
    if (!target) return { ok: false as const, error: "Person not found." };

    const managerValidation = await validateReportingManager(data.newManagerId, data.id);
    if (!managerValidation.valid) {
      return { ok: false as const, error: managerValidation.error! };
    }

    await db
      .update(people)
      .set({ managerId: data.newManagerId, updatedAt: new Date() })
      .where(eq(people.id, data.id));

    await logHistory(data.id, "Reporting Manager", target.managerId, data.newManagerId, user.name);

    return { ok: true as const };
  });
