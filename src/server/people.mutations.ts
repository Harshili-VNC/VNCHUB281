import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { people, credentials } from "../db/schema";
import { hashPassword } from "../lib/password";
import { getSessionPersonId } from "./session";
import { findPersonById, loadPeople, emailExists } from "./repo";
import { generateId } from "./mappers";
import { childRoleOf, getVisiblePeople, eligibleNewManagers, roleLabel } from "../lib/hierarchy";

function generateTempPassword() {
  const digits = Math.floor(100 + Math.random() * 900);
  return `Welcome@${digits}`;
}

async function requireCurrentUser() {
  const personId = await getSessionPersonId();
  if (!personId) return null;
  const person = await findPersonById(personId);
  return person && person.status === "active" ? person : null;
}

const addPersonSchema = z.object({
  name: z.string().min(1),
  email: z.string().min(1),
  department: z.string(),
});

export const addPersonFn = createServerFn({ method: "POST" })
  .validator(addPersonSchema)
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { ok: false as const, error: "You must be signed in." };

    const role = childRoleOf(user.role);
    if (!role)
      return { ok: false as const, error: `${roleLabel(user.role)} cannot add anyone below them.` };

    const name = data.name.trim();
    const normalizedEmail = data.email.trim().toLowerCase();
    if (!name || !normalizedEmail)
      return { ok: false as const, error: "Name and email are required." };

    if (await emailExists(normalizedEmail)) {
      return { ok: false as const, error: "Someone with that email already exists." };
    }

    const tempPassword = generateTempPassword();
    const id = generateId(role.replace(/\s+/g, "").slice(0, 3).toLowerCase());

    await db.insert(people).values({
      id,
      name,
      email: normalizedEmail,
      role,
      department: data.department.trim() || user.department,
      managerId: user.id,
      status: "active",
    });
    await db.insert(credentials).values({
      email: normalizedEmail,
      personId: id,
      passwordHash: hashPassword(tempPassword),
    });

    return {
      ok: true as const,
      person: {
        id,
        name,
        email: normalizedEmail,
        role,
        department: data.department.trim() || user.department,
      },
      tempPassword,
    };
  });

const updatePersonSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().min(1),
  department: z.string(),
});

export const updatePersonFn = createServerFn({ method: "POST" })
  .validator(updatePersonSchema)
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { ok: false as const, error: "You must be signed in." };

    const target = await findPersonById(data.id);
    if (!target) return { ok: false as const, error: "Person not found." };

    const allPeople = await loadPeople();
    const visible = getVisiblePeople(allPeople, user);
    if (data.id === user.id || !visible.some((p) => p.id === data.id)) {
      return { ok: false as const, error: "You can only edit people within your own team." };
    }

    const normalizedEmail = data.email.trim().toLowerCase();
    if (normalizedEmail !== target.email && (await emailExists(normalizedEmail))) {
      return { ok: false as const, error: "Someone with that email already exists." };
    }

    await db
      .update(people)
      .set({ name: data.name.trim(), email: normalizedEmail, department: data.department.trim() })
      .where(eq(people.id, data.id));

    if (normalizedEmail !== target.email) {
      await db
        .update(credentials)
        .set({ email: normalizedEmail })
        .where(eq(credentials.email, target.email));
    }

    return { ok: true as const };
  });

const setStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["active", "inactive"]),
});

export const setPersonStatusFn = createServerFn({ method: "POST" })
  .validator(setStatusSchema)
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { ok: false as const, error: "You must be signed in." };
    if (data.id === user.id)
      return { ok: false as const, error: "You cannot deactivate your own account." };

    const allPeople = await loadPeople();
    const visible = getVisiblePeople(allPeople, user);
    if (!visible.some((p) => p.id === data.id)) {
      return { ok: false as const, error: "You can only manage people within your own team." };
    }

    await db.update(people).set({ status: data.status }).where(eq(people.id, data.id));
    return { ok: true as const };
  });

const reassignSchema = z.object({
  id: z.string().min(1),
  newManagerId: z.string().min(1),
});

export const reassignPersonFn = createServerFn({ method: "POST" })
  .validator(reassignSchema)
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { ok: false as const, error: "You must be signed in." };

    const target = await findPersonById(data.id);
    if (!target) return { ok: false as const, error: "Person not found." };

    const allPeople = await loadPeople();
    const visible = getVisiblePeople(allPeople, user);
    if (!visible.some((p) => p.id === data.id)) {
      return { ok: false as const, error: "You can only reassign people within your own team." };
    }

    const eligible = eligibleNewManagers(allPeople, user, target);
    if (!eligible.some((p) => p.id === data.newManagerId)) {
      return { ok: false as const, error: "That is not a valid new manager for this person." };
    }

    await db.update(people).set({ managerId: data.newManagerId }).where(eq(people.id, data.id));
    return { ok: true as const };
  });
