// Populates a fresh production database with core Master Data (Departments,
// Designation Levels, Designations).
//
// Run with: npm run db:seed

import { config as loadEnv } from "dotenv";
loadEnv();
import { db, queryClient } from "./client";
import { departments, designations, designationLevels } from "./schema";

// --- Production Master Data: Departments ---
const departmentsToInsert = [
  { id: "dept-executive-office", name: "Executive Office" },
  { id: "dept-administration", name: "Administration" },
  { id: "dept-marketing", name: "Marketing" },
  { id: "dept-finance", name: "Finance" },
  { id: "dept-people-ops", name: "People Ops" },
  { id: "dept-efa-operations", name: "EFA Operations" },
  { id: "dept-sca-operations", name: "SCA Operations" },
  { id: "dept-anza-operations", name: "ANZA Operations" },
  { id: "dept-mbs-operations", name: "MBS Operations" },
  { id: "dept-engineering", name: "Engineering" },
];

// --- Production Master Data: Designation Levels ---
const designationLevelsToInsert = [
  { id: "desiglvl-exec", name: "Executive Leadership", rank: 1 },
  { id: "desiglvl-senior-mgmt", name: "Senior Management", rank: 2 },
  { id: "desiglvl-mgmt", name: "Management", rank: 3 },
  { id: "desiglvl-team-lead", name: "Team Lead", rank: 4 },
  { id: "desiglvl-ic", name: "Individual Contributor", rank: 5 },
];

// --- Production Master Data: Designations ---
const designationsToInsert = [
  { id: "desig-ceo", name: "CEO" },
  { id: "desig-managing-director", name: "Managing Director" },
  { id: "desig-admin", name: "Admin" },
  { id: "desig-finance-head", name: "Finance Head" },
  { id: "desig-business-unit-head", name: "Business Unit Head" },
  { id: "desig-human-resources", name: "Human Resources" },
  { id: "desig-marketing-head", name: "Marketing Head" },
  { id: "desig-team-lead", name: "Team Lead" },
  { id: "desig-assistant-team-lead", name: "Assistant Team Lead" },
  { id: "desig-employee", name: "Employee" },
];

async function main() {
  console.log("Seeding production Master Data...");

  console.log(`Seeding ${departmentsToInsert.length} departments...`);
  await db
    .insert(departments)
    .values(departmentsToInsert)
    .onConflictDoNothing({ target: departments.id });

  console.log(`Seeding ${designationLevelsToInsert.length} designation levels...`);
  await db
    .insert(designationLevels)
    .values(designationLevelsToInsert)
    .onConflictDoNothing({ target: designationLevels.id });

  console.log(`Seeding ${designationsToInsert.length} designations...`);
  await db
    .insert(designations)
    .values(designationsToInsert)
    .onConflictDoNothing({ target: designations.id });

  console.log("Done: Production Master Data seeded successfully.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await queryClient.end();
  });
