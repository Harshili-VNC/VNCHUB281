// Populates a fresh database with the same starting roster, tasks, and leave
// requests the app used to ship with in localStorage.
//
// Run with: npm run db:seed
// (after `docker compose up -d` and `npm run db:push`)

import { config as loadEnv } from "dotenv";
loadEnv();
import { db, queryClient } from "./client";
import { people, credentials, tasks, leaveRequests, departments, designations, designationLevels, clients } from "./schema";
import { hashPassword } from "../lib/password";
import type { DepartmentFunction, PersonStatus } from "../lib/hierarchy";

// Purely a seed-generation convenience — NOT stored in the database. Employee
// Module v1.1 Section 3 doesn't have a fixed role hierarchy (see
// src/lib/hierarchy.ts); this tier is just used here to derive each seed
// person's departmentFunction/isTeamLead/isBusinessUnitHead/designation/
// designationLevel/salary/DOB deterministically.
type SeedTier =
  | "CEO"
  | "ManagingDirector"
  | "BusinessUnitHead"
  | "MarketingHead"
  | "FinanceHead"
  | "TeamLead"
  | "AssistantTeamLead"
  | "HumanResources"
  | "Employee"
  | "Admin";

type SeedPerson = {
  id: string;
  name: string;
  email: string;
  tier: SeedTier;
  department: string;
  managerId: string | null;
  status: PersonStatus;
  createdAt: string;
  password: string;
};

const seedPeople: SeedPerson[] = [
  // --- Executive ---
  {
    id: "ceo-001",
    name: "Aarav Mehta",
    email: "ceo@vnc.com",
    tier: "CEO",
    department: "Executive Office",
    managerId: null,
    status: "active",
    createdAt: "2024-01-08",
    password: "ceo123",
  },
  {
    id: "md-001",
    name: "Ishaan Kapoor",
    email: "md@vnc.com",
    tier: "ManagingDirector",
    department: "Executive Office",
    managerId: null,
    status: "active",
    createdAt: "2024-01-08",
    password: "md123",
  },

  // --- Admin ---
  {
    id: "admin-001",
    name: "Nikhil Bansal",
    email: "admin@vnc.com",
    tier: "Admin",
    department: "Administration",
    managerId: "ceo-001",
    status: "active",
    createdAt: "2024-01-09",
    password: "admin123",
  },

  // --- Department Heads ---
  {
    id: "marketing-head-001",
    name: "Simran Kaur",
    email: "marketing.head@vnc.com",
    tier: "MarketingHead",
    department: "Marketing",
    managerId: "ceo-001",
    status: "active",
    createdAt: "2024-01-10",
    password: "marketing123",
  },
  {
    id: "finance-head-001",
    name: "Meher Kulkarni",
    email: "finance.head@vnc.com",
    tier: "FinanceHead",
    department: "Finance",
    managerId: "ceo-001",
    status: "active",
    createdAt: "2024-01-10",
    password: "finance123",
  },
  {
    id: "hr-001",
    name: "Kabir Malhotra",
    email: "hr@vnc.com",
    tier: "HumanResources",
    department: "People Ops",
    managerId: "admin-001",
    status: "active",
    createdAt: "2024-01-10",
    password: "hr123",
  },

  // --- Exactly Four Business Unit Heads ---
  {
    id: "buhead-esa",
    name: "Divya Suresh",
    email: "buhead.esa@vnc.com",
    tier: "BusinessUnitHead",
    department: "ESA Operations",
    managerId: "ceo-001",
    status: "active",
    createdAt: "2024-01-10",
    password: "buhead123",
  },
  {
    id: "buhead-sca",
    name: "Rajesh Kumar",
    email: "buhead.sca@vnc.com",
    tier: "BusinessUnitHead",
    department: "SCA Operations",
    managerId: "ceo-001",
    status: "active",
    createdAt: "2024-01-10",
    password: "buhead123",
  },
  {
    id: "buhead-anza",
    name: "Sarah Jenkins",
    email: "buhead.anza@vnc.com",
    tier: "BusinessUnitHead",
    department: "ANZA Operations",
    managerId: "ceo-001",
    status: "active",
    createdAt: "2024-01-10",
    password: "buhead123",
  },
  {
    id: "buhead-mbs",
    name: "Amit Patel",
    email: "buhead.mbs@vnc.com",
    tier: "BusinessUnitHead",
    department: "MBS Operations",
    managerId: "ceo-001",
    status: "active",
    createdAt: "2024-01-10",
    password: "buhead123",
  },

  // --- Delivery Roles ---
  {
    id: "leader-001",
    name: "Karthik Venkat",
    email: "teamlead@vnc.com",
    tier: "TeamLead",
    department: "Engineering",
    managerId: "buhead-esa",
    status: "active",
    createdAt: "2024-01-12",
    password: "leader123",
  },
  {
    id: "atl-001",
    name: "Tanvi Oberoi",
    email: "assistant.tl@vnc.com",
    tier: "AssistantTeamLead",
    department: "Engineering",
    managerId: "leader-001",
    status: "active",
    createdAt: "2024-01-13",
    password: "atl123",
  },
  {
    id: "employee-001",
    name: "Ravi Iyer",
    email: "employee@vnc.com",
    tier: "Employee",
    department: "Engineering",
    managerId: "leader-001",
    status: "active",
    createdAt: "2024-01-15",
    password: "member123",
  },
];

// --- Departments, derived from the unique department names above ---
const departmentNames = Array.from(new Set(seedPeople.map((p) => p.department)));
const departmentsToInsert = departmentNames.map((name) => ({
  id: `dept-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  name,
}));
const departmentIdByName = new Map(departmentsToInsert.map((d) => [d.name, d.id]));

// --- A handful of sample clients so Documents / Client Master aren't empty ---
const seedClients = [
  {
    id: "client-acme",
    name: "Acme Corp",
    code: "C-001",
    legalName: "Acme Corporation Ltd",
    businessUnit: "ESA",
    billingEntity: "VNC-GL",
    currency: "USD",
    contractType: "Retainer",
    contractStart: "2024-01-01",
    contractEnd: "2026-12-31",
    status: "Active" as const,
    recordStatus: "Approved" as const,
    approvedBy: "Aarav Mehta",
    approvedAt: "2024-01-05",
  },
  {
    id: "client-northwind",
    name: "Northwind Traders",
    code: "C-002",
    legalName: "Northwind Traders Bank",
    businessUnit: "SCA",
    billingEntity: "VNC-AU",
    currency: "AUD",
    contractType: "Project",
    contractStart: "2024-03-01",
    contractEnd: "2025-09-30",
    status: "Active" as const,
    recordStatus: "Approved" as const,
    approvedBy: "Aarav Mehta",
    approvedAt: "2024-03-04",
  },
  {
    id: "client-vertex",
    name: "Vertex Logistics",
    code: "C-003",
    businessUnit: "ANZA",
    billingEntity: "VNC-AU",
    currency: "AUD",
    contractType: "T&M",
    status: "On Hold" as const,
    recordStatus: "Under Review" as const,
  },
  {
    id: "client-helios",
    name: "Helios Energy",
    code: "C-004",
    businessUnit: "MBS",
    billingEntity: "VNC-IN",
    currency: "INR",
    contractType: "Managed Service",
    status: "Active" as const,
    recordStatus: "Draft" as const,
  },
];

const cityByIndex = [
  { city: "Mumbai", state: "Maharashtra" },
  { city: "Bengaluru", state: "Karnataka" },
  { city: "Delhi", state: "Delhi" },
  { city: "Pune", state: "Maharashtra" },
  { city: "Chennai", state: "Tamil Nadu" },
  { city: "Hyderabad", state: "Telangana" },
  { city: "Kolkata", state: "West Bengal" },
];

const designationByTier: Record<SeedTier, (department: string) => string> = {
  CEO: () => "CEO",
  ManagingDirector: () => "Managing Director",
  Admin: () => "Admin",
  FinanceHead: () => "Finance Head",
  BusinessUnitHead: () => "Business Unit Head",
  HumanResources: () => "Human Resources",
  MarketingHead: () => "Marketing Head",
  TeamLead: () => "Team Lead",
  AssistantTeamLead: () => "Assistant Team Lead",
  Employee: () => "Employee",
};

// Designation master (Employee Module v1.1, Section 16 — computed once per
// unique {tier, department} combination, same two-phase pattern as departments above).
const designationNameByPersonId = new Map(
  seedPeople.map((p) => [p.id, designationByTier[p.tier](p.department)]),
);
const designationNames = Array.from(new Set(designationNameByPersonId.values()));
const designationsToInsert = designationNames.map((name) => ({
  id: `desig-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  name,
}));
const designationIdByName = new Map(designationsToInsert.map((d) => [d.name, d.id]));

const salaryByTier: Record<SeedTier, number> = {
  CEO: 8000000,
  ManagingDirector: 7000000,
  Admin: 3200000,
  FinanceHead: 2600000,
  BusinessUnitHead: 3000000,
  HumanResources: 2200000,
  MarketingHead: 2200000,
  TeamLead: 1600000,
  AssistantTeamLead: 1200000,
  Employee: 900000,
};

const dobYearByTier: Record<SeedTier, number> = {
  CEO: 1975,
  ManagingDirector: 1977,
  Admin: 1982,
  FinanceHead: 1984,
  BusinessUnitHead: 1983,
  HumanResources: 1986,
  MarketingHead: 1987,
  TeamLead: 1990,
  AssistantTeamLead: 1992,
  Employee: 1996,
};

/** Employee Module v1.1, Section 3 fields, derived from the seed-only tier. */
const orgFieldsByTier: Record<
  SeedTier,
  { departmentFunction: DepartmentFunction; isTeamLead: boolean; isBusinessUnitHead: boolean }
> = {
  CEO: { departmentFunction: "Leadership", isTeamLead: false, isBusinessUnitHead: false },
  ManagingDirector: { departmentFunction: "Leadership", isTeamLead: false, isBusinessUnitHead: false },
  Admin: { departmentFunction: "Admin", isTeamLead: false, isBusinessUnitHead: false },
  FinanceHead: { departmentFunction: "Finance", isTeamLead: false, isBusinessUnitHead: false },
  BusinessUnitHead: { departmentFunction: "Operations", isTeamLead: false, isBusinessUnitHead: true },
  HumanResources: { departmentFunction: "HR", isTeamLead: false, isBusinessUnitHead: false },
  MarketingHead: { departmentFunction: "Marketing", isTeamLead: false, isBusinessUnitHead: false },
  TeamLead: { departmentFunction: "Operations", isTeamLead: true, isBusinessUnitHead: false },
  AssistantTeamLead: { departmentFunction: "Operations", isTeamLead: false, isBusinessUnitHead: false },
  Employee: { departmentFunction: "Operations", isTeamLead: false, isBusinessUnitHead: false },
};

/**
 * Designation Level master (Employee Module v1.1, Section 16 — "not free
 * text"). Rank is lower = more senior; used only for sorting/display.
 */
const designationLevelsToInsert = [
  { id: "desiglvl-exec", name: "Executive Leadership", rank: 1 },
  { id: "desiglvl-senior-mgmt", name: "Senior Management", rank: 2 },
  { id: "desiglvl-mgmt", name: "Management", rank: 3 },
  { id: "desiglvl-team-lead", name: "Team Lead", rank: 4 },
  { id: "desiglvl-ic", name: "Individual Contributor", rank: 5 },
];
const designationLevelIdByTier: Record<SeedTier, string> = {
  CEO: "desiglvl-exec",
  ManagingDirector: "desiglvl-exec",
  Admin: "desiglvl-senior-mgmt",
  FinanceHead: "desiglvl-senior-mgmt",
  BusinessUnitHead: "desiglvl-senior-mgmt",
  HumanResources: "desiglvl-senior-mgmt",
  MarketingHead: "desiglvl-senior-mgmt",
  TeamLead: "desiglvl-team-lead",
  AssistantTeamLead: "desiglvl-team-lead",
  Employee: "desiglvl-ic",
};

/** Fills in the new HR fields for a seed person, deterministically from their index. */
function enrichPerson(p: SeedPerson, index: number) {
  const [firstName, ...rest] = p.name.split(" ");
  const lastName = rest.join(" ") || firstName;
  const { city, state } = cityByIndex[index % cityByIndex.length];
  const dobMonth = String((index % 12) + 1).padStart(2, "0");
  const dobDay = String((index % 28) + 1).padStart(2, "0");
  const orgFields = orgFieldsByTier[p.tier];
  const designationName = designationNameByPersonId.get(p.id)!;

  return {
    id: p.id,
    employeeCode: `EMP-${String(index + 1).padStart(4, "0")}`,
    firstName,
    lastName,
    email: p.email,
    phoneNumber: `+91-9${String(800000000 + index * 137).padStart(9, "0")}`,
    dateOfBirth: `${dobYearByTier[p.tier]}-${dobMonth}-${dobDay}`,
    gender: (index % 2 === 0 ? "male" : "female") as "male" | "female",
    address: `${100 + index} MG Road`,
    city,
    state,
    country: "India",
    departmentId: departmentIdByName.get(p.department)!,
    departmentFunction: orgFields.departmentFunction,
    isTeamLead: orgFields.isTeamLead,
    isBusinessUnitHead: orgFields.isBusinessUnitHead,
    designationId: designationIdByName.get(designationName)!,
    designationLevelId: designationLevelIdByTier[p.tier],
    primaryBusinessUnit: p.email.includes("esa")
      ? "ESA"
      : p.email.includes("sca")
      ? "SCA"
      : p.email.includes("anza")
      ? "ANZA"
      : p.email.includes("mbs")
      ? "MBS"
      : null,
    secondaryBusinessUnit: null,
    managerId: p.managerId,
    hireDate: p.createdAt,
    salary: salaryByTier[p.tier],
    employmentStatus: "full_time" as const,
    status: p.status,
  };
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const seedTasks = [
  {
    id: "task-001",
    title: "Flag client emails unanswered past 24 hours",
    description: "Monitor the shared BU inboxes daily and post a sorted digest each morning.",
    priority: "high" as const,
    dueDate: todayIso(),
    assignerId: "manager-001",
    assigneeId: "leader-003",
    status: "in_progress" as const,
    createdAt: addDays(-2),
  },
  {
    id: "task-002",
    title: "Review this month's client process doc",
    description: "Score it against the VNC standard with zero-context eyes and list specific gaps.",
    priority: "medium" as const,
    dueDate: addDays(1),
    assignerId: "manager-001",
    assigneeId: "leader-008",
    status: "todo" as const,
    createdAt: addDays(-1),
  },
  {
    id: "task-003",
    title: "Audit time estimated vs. time logged",
    description:
      "Weekly check across every task — flag overruns, under-logging, and missing entries.",
    priority: "medium" as const,
    dueDate: todayIso(),
    assignerId: "leader-001",
    assigneeId: "employee-001",
    status: "todo" as const,
    createdAt: addDays(-1),
  },
  {
    id: "task-004",
    title: "Quality-score tasks, comments & emails",
    description: "Continuously scan for quality issues and score every client and person.",
    priority: "low" as const,
    dueDate: addDays(2),
    assignerId: "leader-002",
    assigneeId: "employee-003",
    status: "todo" as const,
    createdAt: todayIso(),
  },
  {
    id: "task-005",
    title: "Compile the monthly client Health Band",
    description: "Aggregate financial and relationship metrics into one monthly score per client.",
    priority: "high" as const,
    dueDate: addDays(3),
    assignerId: "manager-005",
    assigneeId: "leader-006",
    status: "in_progress" as const,
    createdAt: addDays(-3),
  },
  {
    id: "task-006",
    title: "Run the post-close financial review",
    description:
      "Check financials for anomalies, draft client-call talking points, and track the call.",
    priority: "high" as const,
    dueDate: addDays(1),
    assignerId: "leader-006",
    assigneeId: "employee-013",
    status: "todo" as const,
    createdAt: addDays(-1),
  },
  {
    id: "task-007",
    title: "Compare actual delivery against the signed SOW",
    description: "Flag billable extras and scope gaps for the Q4 renewal clients.",
    priority: "medium" as const,
    dueDate: addDays(4),
    assignerId: "manager-006",
    assigneeId: "leader-007",
    status: "todo" as const,
    createdAt: todayIso(),
  },
  {
    id: "task-008",
    title: "Screen resumes for the open Engineering req",
    description: "Auto-invite qualifying candidates and run the first-round technical assessment.",
    priority: "medium" as const,
    dueDate: addDays(2),
    assignerId: "manager-002",
    assigneeId: "leader-001",
    status: "todo" as const,
    createdAt: todayIso(),
  },
  {
    id: "task-009",
    title: "Draft the priced proposal for new scope",
    description:
      "Match the client's ask to the right package and flag missing scoping information.",
    priority: "low" as const,
    dueDate: addDays(5),
    assignerId: "manager-004",
    assigneeId: "leader-005",
    status: "done" as const,
    createdAt: addDays(-5),
  },
];

const seedLeaveRequests = [
  {
    id: "leave-001",
    personId: "employee-002",
    managerId: "leader-001",
    startDate: todayIso(),
    endDate: todayIso(),
    reason: "Personal errands",
    status: "approved" as const,
    createdAt: addDays(-4),
    decidedAt: addDays(-3),
  },
  {
    id: "leave-002",
    personId: "leader-004",
    managerId: "manager-003",
    startDate: addDays(1),
    endDate: addDays(2),
    reason: "Family function",
    status: "pending" as const,
    createdAt: addDays(-1),
  },
  {
    id: "leave-003",
    personId: "employee-009",
    managerId: "leader-004",
    startDate: todayIso(),
    endDate: addDays(1),
    reason: "Not feeling well",
    status: "pending" as const,
    createdAt: todayIso(),
  },
  {
    id: "leave-004",
    personId: "manager-004",
    managerId: "md-001",
    startDate: addDays(3),
    endDate: addDays(5),
    reason: "Annual leave",
    status: "pending" as const,
    createdAt: addDays(-2),
  },
  {
    id: "leave-005",
    personId: "employee-015",
    managerId: "leader-007",
    startDate: todayIso(),
    endDate: todayIso(),
    reason: "Medical appointment",
    status: "approved" as const,
    createdAt: addDays(-2),
    decidedAt: addDays(-1),
  },
];

async function main() {
  console.log("Clearing existing seed data...");
  await db.delete(credentials).catch(() => {});
  await db.delete(tasks).catch(() => {});
  await db.delete(leaveRequests).catch(() => {});
  await db.delete(people).catch(() => {});
  await db.delete(clients).catch(() => {});

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

  console.log(`Seeding ${seedClients.length} clients...`);
  await db.insert(clients).values(seedClients).onConflictDoNothing({ target: clients.id });

  console.log(`Seeding ${seedPeople.length} people...`);
  await db
    .insert(people)
    .values(seedPeople.map((p, i) => enrichPerson(p, i)))
    .onConflictDoNothing({ target: people.id });

  console.log("Hashing passwords and seeding credentials...");
  await db
    .insert(credentials)
    .values(
      seedPeople.map((p) => ({
        email: p.email,
        personId: p.id,
        passwordHash: hashPassword(p.password),
      })),
    )
    .onConflictDoNothing({ target: credentials.email });

  console.log(`Seeding ${seedTasks.length} tasks...`);
  await db
    .insert(tasks)
    .values(seedTasks.map(({ createdAt: _createdAt, ...t }) => t))
    .onConflictDoNothing({ target: tasks.id });

  console.log(`Seeding ${seedLeaveRequests.length} leave requests...`);
  await db
    .insert(leaveRequests)
    .values(seedLeaveRequests.map(({ createdAt: _createdAt, decidedAt: _decidedAt, ...l }) => l))
    .onConflictDoNothing({ target: leaveRequests.id });

  console.log("Done. Demo logins for all 10 roles:");
  console.log("  CEO: ceo@vnc.com / ceo123");
  console.log("  Managing Director: md@vnc.com / md123");
  console.log("  ESA BU Head: buhead.esa@vnc.com / buhead123");
  console.log("  SCA BU Head: buhead.sca@vnc.com / buhead123");
  console.log("  ANZA BU Head: buhead.anza@vnc.com / buhead123");
  console.log("  MBS BU Head: buhead.mbs@vnc.com / buhead123");
  console.log("  Marketing Head: marketing.head@vnc.com / marketing123");
  console.log("  Finance Head: finance.head@vnc.com / finance123");
  console.log("  Human Resources: hr@vnc.com / hr123");
  console.log("  Admin: admin@vnc.com / admin123");
  console.log("  Team Lead: teamlead@vnc.com / leader123");
  console.log("  Assistant Team Lead: assistant.tl@vnc.com / atl123");
  console.log("  Employee: employee@vnc.com / member123");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await queryClient.end();
  });
