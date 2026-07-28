// Server-only. Core employee creation/editing/status mutations.

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
  findOrCreateDesignationLevel,
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

const personDetailsFields = {
  // Section 1: Basic Identity
  personalEmail: z.string().optional(),
  phoneNumber: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  // Section 2: Employment
  hireDate: z.string().optional(),
  joiningCtc: z.number().int().optional(),
  employmentStatus: z.enum(["full_time", "part_time", "contract", "intern"]).optional(),
  dateOfExit: z.string().optional(),
  nonActiveReason: z.string().optional(),
  nonActiveOtherReasonText: z.string().optional(),
  salary: z.number().int().optional(),
  // Section 3: Role & Org Mapping
  designation: z.string().optional(),
  designationLevel: z.string().optional(),
  primaryBusinessUnit: z.string().optional(),
  secondaryBusinessUnit: z.string().optional(),
  officialWorkLocation: z.string().optional(),
  employeeCategory: z.string().optional(),
  currentActiveForPlanning: z.boolean().optional(),
  // Section 4: Capacity Planning
  standardMonthlyCapacityHours: z.number().int().optional(),
  standardProjectHours: z.number().int().optional(),
  standardProjectActivityHours: z.number().int().optional(),
  standardOrganisationalActivityHours: z.number().int().optional(),
  // Section 5: Role Tags & Notes
  roleTags: z.array(z.string()).optional(),
  notesRemarks: z.string().optional(),
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
  ]),
  isTeamLead: z.boolean().optional(),
  isBusinessUnitHead: z.boolean().optional(),
};

const addPersonSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  department: z.string().min(1),
  managerId: z.string().optional(),
  password: z.string().min(6),
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

    const departmentId = await findOrCreateDepartment(data.department);
    const designationId = data.designation ? await findOrCreateDesignation(data.designation) : null;
    const designationLevelId = data.designationLevel
      ? await findOrCreateDesignationLevel(data.designationLevel)
      : null;

    const existingCount = await countPeople();
    const employeeCode = `EMP-${String(existingCount + 1).padStart(4, "0")}`;
    const id = generateId("person");

    await db.insert(people).values({
      id,
      employeeCode,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email,
      personalEmail: data.personalEmail?.trim() || null,
      phoneNumber: data.phoneNumber?.trim() || null,
      emergencyContactName: data.emergencyContactName?.trim() || null,
      emergencyContactPhone: data.emergencyContactPhone?.trim() || null,
      emergencyContactRelation: data.emergencyContactRelation?.trim() || null,
      dateOfBirth: data.dateOfBirth || null,
      gender: data.gender ?? null,
      address: data.address?.trim() || null,
      city: data.city?.trim() || null,
      state: data.state?.trim() || null,
      country: data.country?.trim() || null,
      departmentId,
      hireDate: data.hireDate || null,
      joiningCtc: data.joiningCtc ?? null,
      employmentStatus: data.employmentStatus ?? "full_time",
      salary: data.salary ?? null,
      departmentFunction: data.departmentFunction,
      isTeamLead: data.isTeamLead ?? false,
      isBusinessUnitHead: data.isBusinessUnitHead ?? false,
      designationId,
      designationLevelId,
      primaryBusinessUnit: data.primaryBusinessUnit || null,
      secondaryBusinessUnit: data.secondaryBusinessUnit || null,
      managerId: data.managerId || null,
      officialWorkLocation: data.officialWorkLocation || null,
      employeeCategory: data.employeeCategory || null,
      currentActiveForPlanning: data.currentActiveForPlanning ?? true,
      standardMonthlyCapacityHours: data.standardMonthlyCapacityHours ?? 160,
      standardProjectHours: data.standardProjectHours ?? 120,
      standardProjectActivityHours: data.standardProjectActivityHours ?? 20,
      standardOrganisationalActivityHours: data.standardOrganisationalActivityHours ?? 20,
      roleTags: data.roleTags ? JSON.stringify(data.roleTags) : null,
      notesRemarks: data.notesRemarks?.trim() || null,
      status: "active",
    });

    const passwordHash = await hashPassword(data.password);
    await db.insert(credentials).values({ email, personId: id, passwordHash });

    return {
      ok: true as const,
      person: {
        id,
        employeeCode,
        name: `${data.firstName} ${data.lastName}`.trim(),
        email,
        departmentFunction: data.departmentFunction,
      },
    };
  });

const updatePersonSchema = z.object({
  id: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  department: z.string().min(1),
  ...personDetailsFields,
  ...orgMappingFields,
});

export const updatePersonFn = createServerFn({ method: "POST" })
  .validator(updatePersonSchema)
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { ok: false as const, error: "You must be signed in." };

    const target = await findPersonById(data.id);
    if (!target) return { ok: false as const, error: "Person not found." };

    const email = data.email.trim().toLowerCase();
    if (email !== target.email && (await emailExists(email))) {
      return { ok: false as const, error: "Another account already uses that email address." };
    }

    const departmentId = await findOrCreateDepartment(data.department);
    const designationId = data.designation ? await findOrCreateDesignation(data.designation) : null;
    const designationLevelId = data.designationLevel
      ? await findOrCreateDesignationLevel(data.designationLevel)
      : null;

    // Track employee history for key field changes
    const changes: { field: string; prev: string; next: string }[] = [];
    if (target.salary !== (data.salary ?? null)) {
      changes.push({ field: "salary", prev: String(target.salary ?? ""), next: String(data.salary ?? "") });
    }
    if (target.departmentFunction !== data.departmentFunction) {
      changes.push({ field: "departmentFunction", prev: target.departmentFunction, next: data.departmentFunction });
    }

    for (const c of changes) {
      await db.insert(employeeHistory).values({
        id: generateId("eh"),
        personId: data.id,
        field: c.field,
        previousValue: c.prev,
        newValue: c.next,
        changedBy: user.name,
      });
    }

    await db
      .update(people)
      .set({
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email,
        personalEmail: data.personalEmail?.trim() || null,
        phoneNumber: data.phoneNumber?.trim() || null,
        emergencyContactName: data.emergencyContactName?.trim() || null,
        emergencyContactPhone: data.emergencyContactPhone?.trim() || null,
        emergencyContactRelation: data.emergencyContactRelation?.trim() || null,
        dateOfBirth: data.dateOfBirth || null,
        gender: data.gender ?? null,
        address: data.address?.trim() || null,
        city: data.city?.trim() || null,
        state: data.state?.trim() || null,
        country: data.country?.trim() || null,
        departmentId,
        hireDate: data.hireDate || null,
        joiningCtc: data.joiningCtc ?? target.joiningCtc,
        employmentStatus: data.employmentStatus ?? target.employmentStatus,
        dateOfExit: data.dateOfExit || null,
        nonActiveReason: data.nonActiveReason || null,
        nonActiveOtherReasonText: data.nonActiveOtherReasonText || null,
        salary: data.salary ?? null,
        departmentFunction: data.departmentFunction,
        isTeamLead: data.isTeamLead ?? target.isTeamLead,
        isBusinessUnitHead: data.isBusinessUnitHead ?? target.isBusinessUnitHead,
        designationId,
        designationLevelId,
        primaryBusinessUnit: data.primaryBusinessUnit || null,
        secondaryBusinessUnit: data.secondaryBusinessUnit || null,
        officialWorkLocation: data.officialWorkLocation || null,
        employeeCategory: data.employeeCategory || null,
        currentActiveForPlanning: data.currentActiveForPlanning ?? target.currentActiveForPlanning,
        standardMonthlyCapacityHours: data.standardMonthlyCapacityHours ?? target.standardMonthlyCapacityHours,
        standardProjectHours: data.standardProjectHours ?? target.standardProjectHours,
        standardProjectActivityHours: data.standardProjectActivityHours ?? target.standardProjectActivityHours,
        standardOrganisationalActivityHours: data.standardOrganisationalActivityHours ?? target.standardOrganisationalActivityHours,
        roleTags: data.roleTags ? JSON.stringify(data.roleTags) : null,
        notesRemarks: data.notesRemarks?.trim() || null,
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

    await db
      .update(people)
      .set({ status: data.status, updatedAt: new Date() })
      .where(eq(people.id, data.id));
    return { ok: true as const };
  });

export const reassignPersonFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1), newManagerId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { ok: false as const, error: "You must be signed in." };

    await db
      .update(people)
      .set({ managerId: data.newManagerId, updatedAt: new Date() })
      .where(eq(people.id, data.id));
    return { ok: true as const };
  });
