// Server-only. Export Center (ported from the "Masters" module). Builds a
// CSV for the requested module and logs one row per export in exportJobs.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "../db/client";
import { exportJobs } from "../db/schema";
import { getSessionPersonId } from "./session";
import { findPersonById, loadClients, loadPeople } from "./repo";
import { generateId } from "./mappers";

async function requireCurrentUser() {
  const personId = await getSessionPersonId();
  if (!personId) return null;
  const person = await findPersonById(personId);
  return person && person.status === "active" ? person : null;
}

function escapeCsvCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsv(headers: string[], rows: string[][]): string {
  return [headers, ...rows].map((r) => r.map(escapeCsvCell).join(",")).join("\n");
}

const createExportSchema = z.object({
  module: z.enum(["Client Master", "Employee Master"]),
  format: z.enum(["CSV"]).default("CSV"),
});

export const createExportFn = createServerFn({ method: "POST" })
  .validator(createExportSchema)
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { ok: false as const, error: "You must be signed in." };

    let csv: string;
    let rowCount: number;

    if (data.module === "Client Master") {
      const clients = await loadClients();
      csv = toCsv(
        ["Code", "Name", "Legal Name", "BU", "Billing Entity", "Currency", "Status", "Record Status"],
        clients.map((c) => [
          c.code ?? "",
          c.name,
          c.legalName ?? "",
          c.businessUnit ?? "",
          c.billingEntity ?? "",
          c.currency ?? "",
          c.status,
          c.recordStatus,
        ]),
      );
      rowCount = clients.length;
    } else {
      const people = await loadPeople();
      csv = toCsv(
        ["Employee Code", "Name", "Email", "Department Function", "Department", "Designation", "Status"],
        people.map((p) => [
          p.employeeCode,
          p.name,
          p.email,
          p.departmentFunction,
          p.department,
          p.designation ?? "",
          p.status,
        ]),
      );
      rowCount = people.length;
    }

    await db.insert(exportJobs).values({
      id: generateId("export"),
      module: data.module,
      format: data.format,
      status: "Completed",
      rowCount,
      createdBy: user.name,
    });

    return { ok: true as const, csv, rowCount };
  });
