// Server-only. Import Center / Import History (ported from the "Masters"
// module). Parses a small CSV (sent as plain text from the client — no
// external CSV library needed) and persists valid rows.
//
// Scope note: only the Client Master import actually creates records.
// Employee Master import is validate-only (row counts + an error report) —
// onboarding a person also needs login credentials, which bulk import
// shouldn't create, so real employee creation stays in the Users screen.
// This mirrors the source module's own "sensitive fields are blocked from
// bulk import" rule, just applied at the record level for people.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { clients, importJobs } from "../db/schema";
import { getSessionPersonId } from "./session";
import { findPersonById } from "./repo";
import { generateId } from "./mappers";
import { nextClientCode, type ImportRowError } from "../lib/documents";

async function requireCurrentUser() {
  const personId = await getSessionPersonId();
  if (!personId) return null;
  const person = await findPersonById(personId);
  return person && person.status === "active" ? person : null;
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const rows = lines.slice(1).map((l) => l.split(",").map((c) => c.trim()));
  return { headers, rows };
}

const runImportSchema = z.object({
  module: z.enum(["Client Master", "Employee Master"]),
  fileName: z.string().min(1),
  fileText: z.string(),
});

export const runImportFn = createServerFn({ method: "POST" })
  .validator(runImportSchema)
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { ok: false as const, error: "You must be signed in." };

    const { headers, rows } = parseCsv(data.fileText);
    const errors: ImportRowError[] = [];
    let successRows = 0;

    if (data.module === "Client Master") {
      const nameIdx = headers.indexOf("name");
      const legalNameIdx = headers.indexOf("legalname");
      const buIdx = headers.indexOf("businessunit");
      if (nameIdx === -1) {
        errors.push({ row: 0, field: "name", message: "Missing required column 'name'." });
      } else {
        const existingCodes = (await db.select({ code: clients.code }).from(clients)).map(
          (r) => r.code,
        );
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const rowNum = i + 2; // account for header row, 1-indexed
          const name = row[nameIdx]?.trim();
          if (!name) {
            errors.push({ row: rowNum, field: "name", message: "Name is required." });
            continue;
          }
          const [dup] = await db.select().from(clients).where(eq(clients.name, name)).limit(1);
          if (dup) {
            errors.push({ row: rowNum, field: "name", message: `Duplicate client "${name}".` });
            continue;
          }
          const code = nextClientCode(existingCodes);
          existingCodes.push(code);
          await db.insert(clients).values({
            id: generateId("client"),
            name,
            code,
            legalName: legalNameIdx !== -1 ? row[legalNameIdx]?.trim() || null : null,
            businessUnit: buIdx !== -1 ? row[buIdx]?.trim() || null : null,
            status: "Active",
            recordStatus: "Draft",
          });
          successRows++;
        }
      }
    } else {
      // Employee Master: validate only (see file header note).
      const emailIdx = headers.indexOf("email");
      const firstNameIdx = headers.indexOf("firstname");
      const lastNameIdx = headers.indexOf("lastname");
      if (emailIdx === -1 || firstNameIdx === -1 || lastNameIdx === -1) {
        errors.push({
          row: 0,
          field: "columns",
          message: "Required columns: firstName, lastName, email.",
        });
      } else {
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const rowNum = i + 2;
          if (!row[firstNameIdx]?.trim() || !row[lastNameIdx]?.trim() || !row[emailIdx]?.trim()) {
            errors.push({ row: rowNum, field: "required", message: "Missing required field." });
            continue;
          }
          successRows++;
        }
      }
    }

    const totalRows = rows.length;
    const failedRows = totalRows - successRows;
    const status =
      failedRows === 0 ? ("Completed" as const) : successRows === 0 ? ("Failed" as const) : ("Completed with errors" as const);

    const jobId = generateId("import");
    await db.insert(importJobs).values({
      id: jobId,
      module: data.module,
      fileName: data.fileName,
      totalRows,
      successRows,
      failedRows,
      status,
      errorLog: JSON.stringify(errors),
      createdBy: user.name,
    });

    return { ok: true as const, jobId, totalRows, successRows, failedRows, errors };
  });
