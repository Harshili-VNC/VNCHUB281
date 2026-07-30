// Server-only. Import Center / Import History (ported from the "Masters"
// module). Parses CSV and persists valid rows for Client Master and Employee Master.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { clients, people, credentials, importJobs, employeeHistory } from "../db/schema";
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
import { nextClientCode, type ImportRowError } from "../lib/documents";

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

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ""));
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
          const rowNum = i + 2;
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
      // Employee Master: full transactional CSV validation and record creation
      if (!canManagePeople(user)) {
        return { ok: false as const, error: "You don't have permission to import employees." };
      }

      const getHeaderIdx = (...keys: string[]) => {
        for (const k of keys) {
          const idx = headers.indexOf(k);
          if (idx !== -1) return idx;
        }
        return -1;
      };

      const emailIdx = getHeaderIdx("workemail", "email");
      const nameIdx = getHeaderIdx("fullname", "displayname", "name");
      const firstNameIdx = getHeaderIdx("firstname");
      const lastNameIdx = getHeaderIdx("lastname");
      const deptIdx = getHeaderIdx("department");
      const subDeptIdx = getHeaderIdx("subdepartment");
      const titleIdx = getHeaderIdx("jobtitle", "designation");
      const locationIdx = getHeaderIdx("location", "officialworklocation");
      const legalEntityIdx = getHeaderIdx("legalentity");
      const buIdx = getHeaderIdx("businessunit", "primarybusinessunit");
      const managerIdx = getHeaderIdx("reportingto", "managerid", "manager");
      const hireDateIdx = getHeaderIdx("datejoined", "hiredate");
      const passwordIdx = getHeaderIdx("password");
      const empCodeIdx = getHeaderIdx("employeenumber", "employeecode");

      if (emailIdx === -1 || (nameIdx === -1 && (firstNameIdx === -1 || lastNameIdx === -1))) {
        errors.push({
          row: 0,
          field: "columns",
          message: "Required CSV columns: Work Email, Full Name (or First Name & Last Name).",
        });
      } else {
        const processedEmails = new Set<string>();
        const processedCodes = new Set<string>();

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const rowNum = i + 2;

          const rawEmail = row[emailIdx]?.trim().toLowerCase();
          let firstName = firstNameIdx !== -1 ? row[firstNameIdx]?.trim() : "";
          let lastName = lastNameIdx !== -1 ? row[lastNameIdx]?.trim() : "";
          if (nameIdx !== -1 && (!firstName || !lastName)) {
            const rawName = row[nameIdx]?.trim() || "";
            const parts = rawName.split(/\s+/);
            firstName = parts[0] || "";
            lastName = parts.slice(1).join(" ") || firstName;
          }

          const rawDept = deptIdx !== -1 ? row[deptIdx]?.trim() : "Operations";
          const password = passwordIdx !== -1 ? row[passwordIdx]?.trim() : "Welcome@123";

          if (!rawEmail || !firstName || !lastName) {
            errors.push({ row: rowNum, field: "required", message: "Missing required fields (Work Email, Name)." });
            continue;
          }

          if (processedEmails.has(rawEmail) || (await emailExists(rawEmail))) {
            errors.push({ row: rowNum, field: "email", message: `Duplicate email address "${rawEmail}".` });
            continue;
          }

          let employeeCode = empCodeIdx !== -1 ? row[empCodeIdx]?.trim() : "";
          if (!employeeCode) {
            const currentCount = (await countPeople()) + successRows;
            employeeCode = `EMP-${String(currentCount + 1).padStart(4, "0")}`;
          }

          if (processedCodes.has(employeeCode)) {
            errors.push({ row: rowNum, field: "employeeCode", message: `Duplicate employee code "${employeeCode}".` });
            continue;
          }

          let managerId: string | null = null;
          if (managerIdx !== -1 && row[managerIdx]?.trim()) {
            const managerVal = row[managerIdx]?.trim();
            const mgr = await findPersonById(managerVal);
            if (!mgr) {
              errors.push({ row: rowNum, field: "manager", message: `Reporting manager "${managerVal}" not found.` });
              continue;
            }
            if (mgr.status !== "active") {
              errors.push({ row: rowNum, field: "manager", message: `Reporting manager "${managerVal}" is inactive.` });
              continue;
            }
            managerId = mgr.id;
          }

          const departmentId = await findOrCreateDepartment(rawDept || "Operations");
          const designationId = titleIdx !== -1 && row[titleIdx]?.trim() ? await findOrCreateDesignation(row[titleIdx].trim()) : null;
          const id = generateId("person");

          await db.insert(people).values({
            id,
            employeeCode,
            firstName,
            lastName,
            email: rawEmail,
            officialWorkLocation: locationIdx !== -1 ? row[locationIdx]?.trim() || null : null,
            legalEntity: legalEntityIdx !== -1 ? row[legalEntityIdx]?.trim() || null : null,
            primaryBusinessUnit: buIdx !== -1 ? row[buIdx]?.trim() || null : null,
            departmentId,
            subDepartment: subDeptIdx !== -1 ? row[subDeptIdx]?.trim() || null : null,
            designationId,
            managerId,
            hireDate: hireDateIdx !== -1 ? row[hireDateIdx]?.trim() || null : null,
            departmentFunction: "Operations",
            status: "active",
          });

          const passwordHash = await hashPassword(password || "Welcome@123");
          await db.insert(credentials).values({ email: rawEmail, personId: id, passwordHash });

          await db.insert(employeeHistory).values({
            id: generateId("eh"),
            personId: id,
            field: "Created",
            previousValue: "—",
            newValue: `Employee ${employeeCode} imported via CSV`,
            changedBy: user.name,
          });

          processedEmails.add(rawEmail);
          processedCodes.add(employeeCode);
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
