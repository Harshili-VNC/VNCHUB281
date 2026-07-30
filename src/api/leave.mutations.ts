import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { leaveRequests } from "../db/schema";
import { getSessionPersonId } from "./session";
import { findPersonById, loadLeaveRequests, loadUserPermissionsMap } from "./repo";
import { generateId } from "./mappers";
import type { LeaveRequest } from "../lib/workspace";
import { hasPermission } from "../lib/permissions";

async function requireCurrentUser() {
  const personId = await getSessionPersonId();
  if (!personId) return null;
  const person = await findPersonById(personId);
  return person && person.status === "active" ? person : null;
}

const requestLeaveSchema = z.object({
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  reason: z.string(),
});

export const requestLeaveFn = createServerFn({ method: "POST" })
  .validator(requestLeaveSchema)
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { ok: false as const, error: "You must be signed in." };

    const userPermissions = await loadUserPermissionsMap(user.designationId, user.designationId);
    if (!hasPermission(userPermissions, "leave.apply")) {
      return { ok: false as const, error: "Forbidden: You do not have permission to apply for leave." };
    }

    if (!user.managerId)
      return { ok: false as const, error: "There's no manager above you to approve leave." };
    if (data.endDate < data.startDate) {
      return { ok: false as const, error: "End date can't be before the start date." };
    }

    await db.insert(leaveRequests).values({
      id: generateId("leave"),
      personId: user.id,
      managerId: user.managerId,
      startDate: data.startDate,
      endDate: data.endDate,
      reason: data.reason.trim(),
      status: "pending",
    });

    return { ok: true as const };
  });

const decideLeaveSchema = z.object({
  id: z.string().min(1),
  decision: z.enum(["approved", "rejected"]),
});

export const decideLeaveFn = createServerFn({ method: "POST" })
  .validator(decideLeaveSchema)
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { ok: false as const, error: "You must be signed in." };

    const userPermissions = await loadUserPermissionsMap(user.designationId, user.designationId);
    const permKey = data.decision === "approved" ? "leave.approve" : "leave.reject";
    if (!hasPermission(userPermissions, permKey)) {
      return { ok: false as const, error: `Forbidden: You do not have permission to ${data.decision} leave requests.` };
    }

    const allRequests = await loadLeaveRequests();
    const request = allRequests.find((r: LeaveRequest) => r.id === data.id);
    if (!request) return { ok: false as const, error: "Request not found." };
    if (request.managerId !== user.id) {
      return { ok: false as const, error: "Only their manager can decide this request." };
    }
    if (request.status !== "pending") {
      return { ok: false as const, error: "This request was already decided." };
    }

    await db
      .update(leaveRequests)
      .set({ status: data.decision, decidedAt: new Date() })
      .where(eq(leaveRequests.id, data.id));

    return { ok: true as const };
  });
