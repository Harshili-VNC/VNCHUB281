// Server-only. Thin data-access layer over Drizzle so the rest of the server
// code reads like plain arrays, same as the old localStorage version did.

import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { people, tasks, leaveRequests, credentials } from "../db/schema";
import { toPerson, toTask, toLeaveRequest } from "./mappers";
import type { Person } from "../lib/hierarchy";

export async function loadPeople(): Promise<Person[]> {
  const rows = await db.select().from(people);
  return rows.map(toPerson);
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
  return row ? toPerson(row) : null;
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
