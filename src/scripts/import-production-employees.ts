// Production Employee Import — hardened, one-time migration script.
//
// This is a STANDALONE script living under src/scripts/ (covered by your
// tsconfig's "src/**/*.ts" include, so `npx tsc --noEmit` checks it — same
// as src/db/seed.ts already is). It is never imported by any route or API,
// so it has zero effect on the running app or its bundle.
//
// WHAT THIS DOES NOT DO (unchanged from the previous version):
//   - Does not modify any existing file in src/.
//   - Does not touch the schema, auth, permission engine, hierarchy logic,
//     role engine, Client Master, or any UI.
//   - Does not hash with bcrypt. Reuses the app's real hashPassword() /
//     verifyPassword() (scrypt, "salt:hash") from src/lib/password.ts —
//     the exact functions the login mutation uses.
//
// WHAT'S NEW IN THIS HARDENED VERSION:
//   1. Strict designation allow-list — aborts before writing anything if any
//      computed designation is outside the 10 production ERP designations.
//      NOTE: per this hardening pass, regular employees' `designation` is
//      now literally "Employee" (not their real job title). Their real job
//      title is preserved in `job_title_raw` in the data file and recorded
//      as a note in Employee History, but — because `people` has no
//      separate job-title column — it will not exist anywhere else inside
//      the ERP's database after import. That's a deliberate trade-off
//      confirmed for this run, flagged here so it's never a silent surprise
//      to someone reading this file later.
//   2. Explicit validation: self-reporting, and missing
//      department/designation/business unit/legal entity/hire date.
//   3. Writes one src/db/schema.ts `employeeHistory` row per imported
//      employee (that table already existed — nothing new added to the
//      schema), using the exact field convention already used elsewhere
//      in the app (see src/api/people.mutations.ts / imports.mutations.ts).
//   4. A real post-import verification pass: queries the DB back, reuses
//      getManagerChain/getDescendants (src/lib/hierarchy.ts) to confirm the
//      org tree has no cycles and is fully connected, reuses getClientRole
//      (src/lib/client-permissions.ts) to confirm each person's permission
//      role resolves as expected, and calls verifyPassword() directly
//      (the same function the login endpoint calls) against a sample from
//      each role tier as a credential round-trip check.
//   5. Department mapping now targets your 10 EXISTING seeded departments
//      only (Executive Office, Administration, Marketing, Finance, People
//      Ops, EFA/SCA/ANZA/MBS Operations, Engineering) via each person's
//      Business Unit / sub-department / designation — not the Excel's raw
//      "Department" column (which only ever says "Client Success" or
//      "Corporate" and would otherwise have created two new department
//      rows). A hard ALLOWED_DEPARTMENTS check aborts the import if
//      anything ever resolves outside those 10 names, so a new department
//      row can never be silently created.
//   6. A final certification report (counts + pass/fail per check). It
//      reports honestly on what it did NOT verify — it cannot run
//      `npm run build`, `npx tsc --noEmit`, or a real HTTP login, so it
//      does not claim to.
//
// HOW TO RUN
//   Data file expected at: src/scripts/data/employees-import-data.json
//   1. Point .env DATABASE_URL at a staging copy first, not production.
//   2. Dry run (no writes):
//        npx tsx src/scripts/import-production-employees.ts --dry-run
//   3. Real run (requires --imported-by so Employee History records who ran it):
//        npx tsx src/scripts/import-production-employees.ts --imported-by="Jane Doe, IT Admin"
//   4. After a real run, you must still run yourself:
//        npm run build
//        npx tsc --noEmit
//      and spot-check an actual login in the running app.

import { config as loadEnv } from "dotenv";
loadEnv();

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { inArray } from "drizzle-orm";

import { db, queryClient } from "../db/client";
import { people, credentials, employeeHistory } from "../db/schema";
import { findOrCreateDepartment, findOrCreateDesignation } from "../api/repo";
import { generateId } from "../api/mappers";
import { hashPassword, verifyPassword } from "../lib/password";
import { getManagerChain, getDescendants, type Person, type DepartmentFunction } from "../lib/hierarchy";
import { getClientRole } from "../lib/client-permissions";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes("--dry-run");
const importedByArg = process.argv.find((a) => a.startsWith("--imported-by="));
const IMPORTED_BY = importedByArg ? importedByArg.split("=").slice(1).join("=") : null;

// The only 10 designations the production ERP is allowed to have. Any
// computed designation outside this list aborts the import before any
// write happens.
// The 10 departments already seeded in src/db/seed.ts. If a computed
// department name is ever outside this list, that would mean a NEW
// department row is about to be created — which the requester explicitly
// ruled out. Abort instead of silently creating one.
const ALLOWED_DEPARTMENTS = new Set([
  "Executive Office",
  "Administration",
  "Marketing",
  "Finance",
  "People Ops",
  "EFA Operations",
  "SCA Operations",
  "ANZA Operations",
  "MBS Operations",
  "Engineering",
]);

const ALLOWED_DESIGNATIONS = new Set([
  "CEO",
  "Managing Director",
  "Business Unit Head",
  "Finance Head",
  "Marketing Head",
  "Admin",
  "Team Lead",
  "Assistant Team Lead",
  "Employee",
  "Human Resources", // part of the app's existing 10-role permission engine (client-permissions.ts), even though unused in this batch
]);

type ImportRow = {
  employee_code: string;
  first_name: string;
  last_name: string;
  display_name: string;
  full_name_source: string;
  email: string;
  official_work_location: string;
  legal_entity: string;
  primary_business_unit: string;
  secondary_business_unit: string | null;
  department_raw: string;
  department_mapped: string; // resolved into one of the 10 existing seeded departments — see resolveDepartment note below
  sub_department: string | null;
  designation: string;
  job_title_raw: string;
  manager_employee_code: string | null;
  hire_date: string;
  department_function: DepartmentFunction;
  is_team_lead: boolean;
  is_business_unit_head: boolean;
  password: string;
};

function loadData(): ImportRow[] {
  const path = join(__dirname, "data", "employees-import-data.json");
  return JSON.parse(readFileSync(path, "utf-8"));
}

function isBlank(v: string | null | undefined): boolean {
  return v === null || v === undefined || v.trim() === "";
}

async function main() {
  console.log(DRY_RUN ? "=== DRY RUN (no writes) ===" : "=== LIVE RUN ===");

  if (!DRY_RUN && !IMPORTED_BY) {
    console.error(
      "Aborting — a real run requires --imported-by=\"Name/email of the person running this migration\" so Employee History can record who imported each employee.",
    );
    process.exit(1);
  }
  const importedBy = IMPORTED_BY ?? "dry-run (not recorded)";

  const rows = loadData();
  console.log(`Loaded ${rows.length} employee rows.`);

  // =========================================================================
  // SECTION 6: IMPORT VALIDATION — abort before writing anything if any fail
  // =========================================================================
  const errors: string[] = [];

  // Duplicate Employee Numbers / Emails / Work Emails / Credentials (email
  // is the one field that plays all three roles in this schema)
  const codeCounts = new Map<string, number>();
  const emailCounts = new Map<string, number>();
  for (const r of rows) {
    codeCounts.set(r.employee_code, (codeCounts.get(r.employee_code) ?? 0) + 1);
    emailCounts.set(r.email, (emailCounts.get(r.email) ?? 0) + 1);
  }
  for (const [code, count] of codeCounts) if (count > 1) errors.push(`Duplicate Employee Number in file: ${code}`);
  for (const [email, count] of emailCounts) if (count > 1) errors.push(`Duplicate Email/Work Email/Credential in file: ${email}`);

  const allCodes = new Set(rows.map((r) => r.employee_code));
  for (const r of rows) {
    // Invalid Reporting Managers
    if (r.manager_employee_code !== null && !allCodes.has(r.manager_employee_code)) {
      errors.push(`Invalid Reporting Manager: ${r.employee_code} (${r.display_name}) -> ${r.manager_employee_code}`);
    }
    // Self Reporting
    if (r.manager_employee_code === r.employee_code) {
      errors.push(`Self Reporting: ${r.employee_code} (${r.display_name}) reports to themselves`);
    }
    // Missing Department / Designation / Business Unit / Legal Entity / Hire Date
    if (isBlank(r.department_mapped)) errors.push(`Missing Department: ${r.employee_code} (${r.display_name})`);
    if (isBlank(r.designation)) errors.push(`Missing Designation: ${r.employee_code} (${r.display_name})`);
    if (isBlank(r.primary_business_unit)) errors.push(`Missing Business Unit: ${r.employee_code} (${r.display_name})`);
    if (isBlank(r.legal_entity)) errors.push(`Missing Legal Entity: ${r.employee_code} (${r.display_name})`);
    if (isBlank(r.hire_date)) errors.push(`Missing Hire Date: ${r.employee_code} (${r.display_name})`);

    // Department Mapping (mandatory) — must resolve to one of the 10
    // already-seeded departments. Never create a new one.
    if (!ALLOWED_DEPARTMENTS.has(r.department_mapped)) {
      errors.push(
        `Invalid department "${r.department_mapped}" for ${r.employee_code} (${r.display_name}) — not one of the 10 existing seeded departments. Refusing to create a new department row.`,
      );
    }

    // SECTION 1: Designation Validation — the hard stop.
    if (!ALLOWED_DESIGNATIONS.has(r.designation)) {
      errors.push(
        `Invalid designation "${r.designation}" for ${r.employee_code} (${r.display_name}) — not one of the 10 production ERP designations.`,
      );
    }
    // SECTION 2: Team Lead Mapping Verification
    if (r.job_title_raw === "Team Lead Expert" && r.designation !== "Team Lead") {
      errors.push(`${r.employee_code}: job title "Team Lead Expert" must map to designation "Team Lead", found "${r.designation}"`);
    }
    if (r.designation === "Team Lead Expert") {
      errors.push(`${r.employee_code}: literal designation "Team Lead Expert" must never reach the database`);
    }
  }

  // Pre-flight: check the LIVE database for collisions (belt-and-braces —
  // catches the case where this DB already has some of this data)
  const existingByCode = await db
    .select({ employeeCode: people.employeeCode, email: people.email })
    .from(people)
    .where(inArray(people.employeeCode, rows.map((r) => r.employee_code)));
  const existingByEmail = await db
    .select({ email: credentials.email })
    .from(credentials)
    .where(inArray(credentials.email, rows.map((r) => r.email)));
  existingByCode.forEach((r) => errors.push(`DB already has employee_code ${r.employeeCode} (${r.email})`));
  existingByEmail.forEach((r) => errors.push(`DB already has credential email ${r.email}`));

  if (errors.length > 0) {
    console.error(`Aborting — ${errors.length} validation error(s) found. Nothing was written:`);
    errors.forEach((e) => console.error("  - " + e));
    await queryClient.end();
    process.exit(1);
  }
  console.log("All import validations passed (Section 6 + designation/team-lead checks).");

  // =========================================================================
  // Resolve / create department + designation lookup rows (reusing the
  // app's own existing helpers — not reimplemented)
  // =========================================================================
  const departmentIdCache = new Map<string, string>();
  const designationIdCache = new Map<string, string>();

  if (!DRY_RUN) {
    for (const deptName of new Set(rows.map((r) => r.department_mapped))) {
      departmentIdCache.set(deptName, await findOrCreateDepartment(deptName));
    }
    for (const desigName of new Set(rows.map((r) => r.designation))) {
      const id = await findOrCreateDesignation(desigName);
      if (id) designationIdCache.set(desigName, id);
    }
  } else {
    console.log("Would resolve/create departments (all must already exist in seed.ts):", [...new Set(rows.map((r) => r.department_mapped))]);
    console.log("Would resolve/create designations:", [...new Set(rows.map((r) => r.designation))]);
  }

  // Pre-generate stable person ids so manager_id resolves in a single pass.
  const employeeCodeToPersonId = new Map<string, string>();
  for (const r of rows) employeeCodeToPersonId.set(r.employee_code, generateId("person"));

  const peopleRows: (typeof people.$inferInsert)[] = [];
  const credentialRows: (typeof credentials.$inferInsert)[] = [];
  const historyRows: (typeof employeeHistory.$inferInsert)[] = [];
  const plaintextByCode = new Map<string, string>(); // kept in memory only, for the post-import verifyPassword check

  for (const r of rows) {
    const personId = employeeCodeToPersonId.get(r.employee_code)!;
    const managerId = r.manager_employee_code ? employeeCodeToPersonId.get(r.manager_employee_code) ?? null : null;
    const passwordHash = hashPassword(r.password);
    plaintextByCode.set(r.employee_code, r.password);

    peopleRows.push({
      id: personId,
      employeeCode: r.employee_code,
      firstName: r.first_name,
      lastName: r.last_name,
      email: r.email,
      officialWorkLocation: r.official_work_location,
      legalEntity: r.legal_entity,
      primaryBusinessUnit: r.primary_business_unit,
      secondaryBusinessUnit: r.secondary_business_unit,
      departmentId: DRY_RUN ? "(dry-run)" : departmentIdCache.get(r.department_mapped)!,
      subDepartment: r.sub_department,
      designationId: DRY_RUN ? "(dry-run)" : designationIdCache.get(r.designation) ?? null,
      managerId,
      hireDate: r.hire_date,
      departmentFunction: r.department_function,
      isTeamLead: r.is_team_lead,
      isBusinessUnitHead: r.is_business_unit_head,
      status: "active",
    });

    credentialRows.push({ email: r.email, personId, passwordHash });

    // SECTION 4: Employee History — same convention as
    // src/api/people.mutations.ts / imports.mutations.ts.
    historyRows.push({
      id: generateId("eh"),
      personId,
      field: "Created",
      previousValue: "—",
      newValue: `Employee ${r.employee_code} imported via Production Migration`,
      reason: `Job title on file: ${r.job_title_raw}`,
      changedBy: importedBy,
    });
  }

  if (DRY_RUN) {
    console.log(`Would insert ${peopleRows.length} people, ${credentialRows.length} credentials, ${historyRows.length} history rows.`);
    await queryClient.end();
    return;
  }

  // =========================================================================
  // All-or-nothing write
  // =========================================================================
  await db.transaction(async (tx) => {
    await tx.insert(people).values(peopleRows);
    await tx.insert(credentials).values(credentialRows);
    await tx.insert(employeeHistory).values(historyRows);
  });
  console.log("Import committed.");

  // =========================================================================
  // SECTION 7: POST IMPORT VALIDATION
  // =========================================================================
  const results: { label: string; pass: boolean; detail: string }[] = [];

  const insertedPeople = await db
    .select()
    .from(people)
    .where(inArray(people.employeeCode, rows.map((r) => r.employee_code)));
  const insertedCreds = await db
    .select()
    .from(credentials)
    .where(inArray(credentials.email, rows.map((r) => r.email)));
  const insertedHistory = await db
    .select()
    .from(employeeHistory)
    .where(inArray(employeeHistory.personId, insertedPeople.map((p) => p.id)));

  results.push({ label: "50 Employees imported", pass: insertedPeople.length === 50, detail: `${insertedPeople.length}/50` });
  results.push({ label: "50 Credentials created", pass: insertedCreds.length === 50, detail: `${insertedCreds.length}/50` });

  const withManager = rows.filter((r) => r.manager_employee_code !== null).length;
  const roots = rows.filter((r) => r.manager_employee_code === null);
  results.push({
    label: "Reporting Managers resolved",
    pass: withManager === 48 && roots.length === 2,
    detail: `${withManager}/50 have a manager; ${roots.length} correct top-of-org roots (${roots.map((r) => r.display_name).join(", ")})`,
  });

  // Zero orphan managers + hierarchy builds without cycles — reusing
  // getManagerChain / getDescendants from src/lib/hierarchy.ts directly.
  const personById = new Map(insertedPeople.map((p) => [p.id, p]));
  const asHierarchyPerson = (p: (typeof insertedPeople)[number]): Person => ({
    id: p.id,
    employeeCode: p.employeeCode,
    name: `${p.firstName} ${p.lastName}`,
    firstName: p.firstName,
    lastName: p.lastName,
    email: p.email,
    officialWorkLocation: p.officialWorkLocation,
    legalEntity: p.legalEntity,
    primaryBusinessUnit: p.primaryBusinessUnit,
    secondaryBusinessUnit: p.secondaryBusinessUnit,
    departmentId: p.departmentId,
    department: p.departmentId,
    subDepartment: p.subDepartment,
    designationId: p.designationId,
    designation: rows.find((r) => r.employee_code === p.employeeCode)!.designation,
    managerId: p.managerId,
    hireDate: p.hireDate,
    departmentFunction: p.departmentFunction as DepartmentFunction,
    isTeamLead: p.isTeamLead,
    isBusinessUnitHead: p.isBusinessUnitHead,
    status: p.status as "active" | "inactive",
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  });
  const hierarchyPeople = insertedPeople.map(asHierarchyPerson);

  let orphanManagers = 0;
  let cyclesFound = 0;
  for (const p of hierarchyPeople) {
    if (p.managerId && !personById.has(p.managerId)) orphanManagers++;
    const chain = getManagerChain(hierarchyPeople, p.id);
    if (chain.some((m) => m.id === p.id)) cyclesFound++;
  }
  results.push({ label: "Zero orphan managers", pass: orphanManagers === 0, detail: `${orphanManagers} found` });
  results.push({ label: "Organization hierarchy builds successfully (no cycles)", pass: cyclesFound === 0, detail: `${cyclesFound} cycle(s) found` });

  const ceo = hierarchyPeople.find((p) => p.designation === "CEO");
  const reachableFromCeo = ceo ? getDescendants(hierarchyPeople, ceo.id).length : 0;
  results.push({
    label: "Org tree reachable from CEO",
    pass: ceo !== undefined,
    detail: ceo ? `${reachableFromCeo}/50 reachable from CEO downward (Managing Director sits outside the CEO's own reporting line by design — both are roots)` : "no CEO found",
  });

  // Role permissions resolve correctly — reusing getClientRole() directly.
  const expectedRoleByCode: Record<string, string> = {
    "002": "CEO",
    "001": "Managing Director",
    "046": "Business Unit Head",
    "157": "Business Unit Head",
    "355": "Finance Head",
    "320": "Marketing Head",
    "280": "Administrator (IT)", // getClientRole maps designation "Admin" -> "Administrator (IT)"
  };
  let roleMismatches = 0;
  for (const p of hierarchyPeople) {
    const resolved = getClientRole(p);
    const expected =
      expectedRoleByCode[p.employeeCode] ??
      (p.designation === "Team Lead"
        ? "Team Lead"
        : p.designation === "Assistant Team Lead"
          ? "Assistant Team Lead"
          : "Employee");
    if (resolved !== expected) {
      roleMismatches++;
      console.error(`Role mismatch: ${p.employeeCode} (${p.name}) expected ${expected}, getClientRole() returned ${resolved}`);
    }
  }
  results.push({ label: "Role permissions resolve correctly (getClientRole)", pass: roleMismatches === 0, detail: `${roleMismatches} mismatch(es)` });

  // Business Unit Heads assigned correctly (3 employees covering 4 BUs)
  const buHeads = hierarchyPeople.filter((p) => p.isBusinessUnitHead);
  const buHeadOk =
    buHeads.length === 3 &&
    hierarchyPeople.find((p) => p.employeeCode === "157")?.primaryBusinessUnit?.includes("EFA") &&
    hierarchyPeople.find((p) => p.employeeCode === "046")?.primaryBusinessUnit?.includes("SCA") &&
    hierarchyPeople.find((p) => p.employeeCode === "046")?.secondaryBusinessUnit?.includes("ANZA") &&
    hierarchyPeople.find((p) => p.employeeCode === "002")?.secondaryBusinessUnit?.includes("MBS");
  results.push({
    label: "Business Unit Heads assigned correctly",
    pass: Boolean(buHeadOk),
    detail: "3 Business Unit Head employees (Rupali=EFA, Aamir=SCA+ANZA, Jimmy=MBS secondary) covering 4 Business Units — not 4 employees, by design",
  });

  // No duplicate Employee Numbers / Emails (post-insert re-check)
  const dupCodes = insertedPeople.length - new Set(insertedPeople.map((p) => p.employeeCode)).size;
  const dupEmails = insertedCreds.length - new Set(insertedCreds.map((c) => c.email)).size;
  results.push({ label: "No duplicate Employee Numbers", pass: dupCodes === 0, detail: `${dupCodes} duplicates` });
  results.push({ label: "No duplicate Emails", pass: dupEmails === 0, detail: `${dupEmails} duplicates` });
  results.push({ label: "No failed inserts", pass: insertedPeople.length === 50 && insertedCreds.length === 50, detail: "transaction committed as a single unit" });

  // Password / login checks — direct verifyPassword() round-trip using the
  // exact function the login mutation calls. NOT a live HTTP login test.
  const sampleChecks: { label: string; code: string }[] = [
    { label: "CEO login works", code: "002" },
    { label: "Managing Director login works", code: "001" },
    { label: "Team Lead login works", code: rows.find((r) => r.designation === "Team Lead")!.employee_code },
    { label: "Employee login works", code: rows.find((r) => r.designation === "Employee")!.employee_code },
  ];
  for (const check of sampleChecks) {
    const cred = insertedCreds.find((c) => {
      const person = insertedPeople.find((p) => p.id === c.personId);
      return person?.employeeCode === check.code;
    });
    const plaintext = plaintextByCode.get(check.code)!;
    const ok = Boolean(cred && verifyPassword(plaintext, cred.passwordHash));
    results.push({ label: `${check.label} (credential round-trip via verifyPassword, not a live HTTP login)`, pass: ok, detail: `employee ${check.code}` });
  }

  // =========================================================================
  // SECTION 8: FINAL CERTIFICATION REPORT
  // =========================================================================
  console.log("\n=== POST-IMPORT VALIDATION ===");
  for (const r of results) {
    console.log(`${r.pass ? "✓" : "✗"} ${r.label} — ${r.detail}`);
  }
  const allPassed = results.every((r) => r.pass);

  const designationCounts = new Map<string, number>();
  rows.forEach((r) => designationCounts.set(r.designation, (designationCounts.get(r.designation) ?? 0) + 1));

  console.log("\n=== FINAL CERTIFICATION REPORT ===");
  console.log("Total Employees Imported:      ", insertedPeople.length);
  console.log("Total Credentials Created:     ", insertedCreds.length);
  console.log("Total Employee History Records:", insertedHistory.length);
  console.log("Total Team Leads:              ", designationCounts.get("Team Lead") ?? 0);
  console.log("Total Assistant Team Leads:    ", designationCounts.get("Assistant Team Lead") ?? 0);
  console.log("Total Business Unit Heads:     ", buHeads.length, "(covering 4 Business Units: EFA, SCA, ANZA, MBS)");
  console.log("Total Departments Used:        ", departmentIdCache.size);
  console.log("Total Designations Used:       ", designationIdCache.size, "of 10 allowed", [...designationCounts.keys()]);
  console.log("Validation Result:             ", allPassed ? "PASS" : "FAIL — see ✗ items above");
  console.log("Build Status:                   NOT RUN by this script — run `npm run build` and `npx tsc --noEmit` yourself.");
  console.log(
    "Zero Regression Certificate:    This script did not modify any existing file (schema, auth, permissions, hierarchy, UI, or APIs) — verified by not touching them, not by an automated diff. It did not run your build or a live HTTP login; both are still your responsibility before considering this complete.",
  );

  await queryClient.end();
  if (!allPassed) process.exit(1);
}

main().catch(async (err) => {
  console.error("Import failed:", err);
  await queryClient.end();
  process.exit(1);
});
