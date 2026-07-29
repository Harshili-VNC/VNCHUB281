// Server-only. Converts Drizzle row shapes (which use JS Date objects for
// timestamp columns) into the plain-string-dated types the client already
// expects (Person/Task/LeaveRequest), so nothing on the client needs to change.

import type { people, tasks, leaveRequests } from "../db/schema";
import type { Person } from "../lib/hierarchy";
import type { Task, LeaveRequest } from "../lib/workspace";

type PersonRow = typeof people.$inferSelect;
type TaskRow = typeof tasks.$inferSelect;
type LeaveRequestRow = typeof leaveRequests.$inferSelect;

export function toPerson(row: PersonRow): Person {
  return {
    id: row.id,
    employeeCode: row.employeeCode,
    name: `${row.firstName} ${row.lastName}`.trim(),
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    officialWorkLocation: row.officialWorkLocation,
    legalEntity: row.legalEntity,
    primaryBusinessUnit: row.primaryBusinessUnit,
    secondaryBusinessUnit: row.secondaryBusinessUnit,
    departmentId: row.departmentId,
    department: row.departmentId,
    subDepartment: row.subDepartment,
    designationId: row.designationId,
    designation: row.designationId,
    managerId: row.managerId,
    hireDate: row.hireDate,
    departmentFunction: row.departmentFunction,
    isTeamLead: row.isTeamLead,
    isBusinessUnitHead: row.isBusinessUnitHead,
    status: row.status,
    createdAt: row.createdAt.toISOString().slice(0, 10),
    updatedAt: row.updatedAt.toISOString().slice(0, 10),
  };
}

export function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    dueDate: row.dueDate,
    assignerId: row.assignerId,
    assigneeId: row.assigneeId,
    status: row.status,
    createdAt: row.createdAt.toISOString().slice(0, 10),
  };
}

export function toLeaveRequest(row: LeaveRequestRow): LeaveRequest {
  return {
    id: row.id,
    personId: row.personId,
    managerId: row.managerId,
    startDate: row.startDate,
    endDate: row.endDate,
    reason: row.reason,
    status: row.status,
    createdAt: row.createdAt.toISOString().slice(0, 10),
    decidedAt: row.decidedAt ? row.decidedAt.toISOString().slice(0, 10) : undefined,
  };
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
