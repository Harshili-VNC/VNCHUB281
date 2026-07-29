import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { tasks } from "../db/schema";
import { getSessionPersonId } from "./session";
import { findPersonById, loadPeople, loadTasks } from "./repo";
import { generateId } from "./mappers";
import { getDirectReports } from "../lib/hierarchy";
import type { Task } from "../lib/workspace";

async function requireCurrentUser() {
  const personId = await getSessionPersonId();
  if (!personId) return null;
  const person = await findPersonById(personId);
  return person && person.status === "active" ? person : null;
}

const addTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  priority: z.enum(["low", "medium", "high"]),
  dueDate: z.string().min(1),
  assigneeId: z.string().min(1),
});

export const addTaskFn = createServerFn({ method: "POST" })
  .validator(addTaskSchema)
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { ok: false as const, error: "You must be signed in." };

    const title = data.title.trim();
    if (!title) return { ok: false as const, error: "Give the task a title." };

    const allPeople = await loadPeople();
    const reports = getDirectReports(allPeople, user.id);
    if (!reports.some((p) => p.id === data.assigneeId)) {
      return { ok: false as const, error: "You can only assign tasks to your own direct reports." };
    }

    const id = generateId("task");
    await db.insert(tasks).values({
      id,
      title,
      description: data.description.trim(),
      priority: data.priority,
      dueDate: data.dueDate,
      assignerId: user.id,
      assigneeId: data.assigneeId,
      status: "todo",
    });

    return { ok: true as const };
  });

const setTaskStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["todo", "in_progress", "done"]),
});

export const setTaskStatusFn = createServerFn({ method: "POST" })
  .validator(setTaskStatusSchema)
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { ok: false as const, error: "You must be signed in." };

    const allTasks = await loadTasks();
    const task = allTasks.find((t: Task) => t.id === data.id);
    if (!task) return { ok: false as const, error: "Task not found." };
    if (task.assigneeId !== user.id && task.assignerId !== user.id) {
      return {
        ok: false as const,
        error: "You can only update tasks you assigned or were assigned.",
      };
    }

    await db.update(tasks).set({ status: data.status }).where(eq(tasks.id, data.id));
    return { ok: true as const };
  });
