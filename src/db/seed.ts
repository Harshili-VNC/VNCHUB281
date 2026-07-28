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
  | "MD"
  | "Founder"
  | "Admin"
  | "Finance"
  | "BUHead"
  | "HR"
  | "Marketing"
  | "ProjectManager"
  | "TeamLeader"
  | "AssistantTeamLeader"
  | "Analyst"
  | "Employee";

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
    tier: "MD",
    department: "Executive Office",
    managerId: null,
    status: "active",
    createdAt: "2024-01-08",
    password: "md123",
  },

  // --- Founder & Admin ---
  {
    id: "founder-001",
    name: "Devika Chandran",
    email: "founder@vnc.com",
    tier: "Founder",
    department: "Executive Office",
    managerId: null,
    status: "active",
    createdAt: "2024-01-08",
    password: "founder123",
  },
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

  // --- Department roles (Finance / BU Head / HR / Marketing) ---
  {
    id: "finance-001",
    name: "Meher Kulkarni",
    email: "finance@vnc.com",
    tier: "Finance",
    department: "Finance",
    managerId: "admin-001",
    status: "active",
    createdAt: "2024-01-10",
    password: "finance123",
  },
  {
    id: "buhead-001",
    name: "Divya Suresh",
    email: "buhead@vnc.com",
    tier: "BUHead",
    department: "Customer Success",
    managerId: "admin-001",
    status: "active",
    createdAt: "2024-01-10",
    password: "buhead123",
  },
  {
    id: "hr-001",
    name: "Kabir Malhotra",
    email: "hr@vnc.com",
    tier: "HR",
    department: "People Ops",
    managerId: "admin-001",
    status: "active",
    createdAt: "2024-01-10",
    password: "hr123",
  },
  {
    id: "marketing-001",
    name: "Simran Kaur",
    email: "marketing@vnc.com",
    tier: "Marketing",
    department: "Marketing",
    managerId: "admin-001",
    status: "active",
    createdAt: "2024-01-10",
    password: "marketing123",
  },

  // --- Project Managers ---
  {
    id: "manager-001",
    name: "Harshili Reddy",
    email: "manager@vnc.com",
    tier: "ProjectManager",
    department: "Product",
    managerId: "admin-001",
    status: "active",
    createdAt: "2024-01-10",
    password: "manager123",
  },
  {
    id: "manager-002",
    name: "Vikram Nair",
    email: "vikram.n@vnc.com",
    tier: "ProjectManager",
    department: "Engineering",
    managerId: "admin-001",
    status: "active",
    createdAt: "2024-01-10",
    password: "manager123",
  },
  {
    id: "manager-003",
    name: "Priya Menon",
    email: "priya.m@vnc.com",
    tier: "ProjectManager",
    department: "Marketing",
    managerId: "admin-001",
    status: "active",
    createdAt: "2024-01-10",
    password: "manager123",
  },
  {
    id: "manager-004",
    name: "Rohan Desai",
    email: "rohan.d@vnc.com",
    tier: "ProjectManager",
    department: "Sales",
    managerId: "admin-001",
    status: "active",
    createdAt: "2024-01-10",
    password: "manager123",
  },
  {
    id: "manager-005",
    name: "Ananya Iyer",
    email: "ananya.i@vnc.com",
    tier: "ProjectManager",
    department: "Finance",
    managerId: "admin-001",
    status: "active",
    createdAt: "2024-01-10",
    password: "manager123",
  },
  {
    id: "manager-006",
    name: "Sanjay Bhatt",
    email: "sanjay.b@vnc.com",
    tier: "ProjectManager",
    department: "Customer Success",
    managerId: "admin-001",
    status: "active",
    createdAt: "2024-01-10",
    password: "manager123",
  },

  // --- Team Leaders ---
  {
    id: "leader-001",
    name: "Karthik Venkat",
    email: "leader@vnc.com",
    tier: "TeamLeader",
    department: "Engineering",
    managerId: "manager-002",
    status: "active",
    createdAt: "2024-01-12",
    password: "leader123",
  },
  {
    id: "leader-002",
    name: "Meera Sharma",
    email: "meera.s@vnc.com",
    tier: "TeamLeader",
    department: "Engineering",
    managerId: "manager-002",
    status: "active",
    createdAt: "2024-01-12",
    password: "leader123",
  },
  {
    id: "leader-003",
    name: "Devika Rao",
    email: "devika.r@vnc.com",
    tier: "TeamLeader",
    department: "Product",
    managerId: "manager-001",
    status: "active",
    createdAt: "2024-01-12",
    password: "leader123",
  },
  {
    id: "leader-004",
    name: "Arjun Malhotra",
    email: "arjun.m@vnc.com",
    tier: "TeamLeader",
    department: "Marketing",
    managerId: "manager-003",
    status: "active",
    createdAt: "2024-01-12",
    password: "leader123",
  },
  {
    id: "leader-005",
    name: "Kabir Singh",
    email: "kabir.s@vnc.com",
    tier: "TeamLeader",
    department: "Sales",
    managerId: "manager-004",
    status: "active",
    createdAt: "2024-01-12",
    password: "leader123",
  },
  {
    id: "leader-006",
    name: "Fatima Sheikh",
    email: "fatima.s@vnc.com",
    tier: "TeamLeader",
    department: "Finance",
    managerId: "manager-005",
    status: "active",
    createdAt: "2024-01-12",
    password: "leader123",
  },
  {
    id: "leader-007",
    name: "Nikhil Chawla",
    email: "nikhil.c@vnc.com",
    tier: "TeamLeader",
    department: "Customer Success",
    managerId: "manager-006",
    status: "active",
    createdAt: "2024-01-12",
    password: "leader123",
  },
  {
    id: "leader-008",
    name: "Ishita Roy",
    email: "ishita.r@vnc.com",
    tier: "TeamLeader",
    department: "Product",
    managerId: "manager-001",
    status: "active",
    createdAt: "2024-01-12",
    password: "leader123",
  },

  // --- Assistant Team Leaders ---
  {
    id: "atl-001",
    name: "Tanvi Oberoi",
    email: "atl@vnc.com",
    tier: "AssistantTeamLeader",
    department: "Engineering",
    managerId: "leader-001",
    status: "active",
    createdAt: "2024-01-13",
    password: "atl123",
  },

  // --- Analysts ---
  {
    id: "analyst-001",
    name: "Yash Trivedi",
    email: "analyst@vnc.com",
    tier: "Analyst",
    department: "Finance",
    managerId: "manager-005",
    status: "active",
    createdAt: "2024-01-13",
    password: "analyst123",
  },

  // --- Employees ---
  {
    id: "employee-001",
    name: "Ravi Iyer",
    email: "member@vnc.com",
    tier: "Employee",
    department: "Engineering",
    managerId: "leader-001",
    status: "active",
    createdAt: "2024-01-15",
    password: "member123",
  },
  {
    id: "employee-002",
    name: "Neha Kapoor",
    email: "neha.k@vnc.com",
    tier: "Employee",
    department: "Engineering",
    managerId: "leader-001",
    status: "active",
    createdAt: "2024-01-16",
    password: "member123",
  },
  {
    id: "employee-003",
    name: "Aditya Rao",
    email: "aditya.r@vnc.com",
    tier: "Employee",
    department: "Engineering",
    managerId: "leader-002",
    status: "active",
    createdAt: "2024-01-16",
    password: "member123",
  },
  {
    id: "employee-004",
    name: "Simran Kaur",
    email: "simran.k@vnc.com",
    tier: "Employee",
    department: "Engineering",
    managerId: "leader-002",
    status: "active",
    createdAt: "2024-01-16",
    password: "member123",
  },
  {
    id: "employee-005",
    name: "Yash Trivedi",
    email: "yash.t@vnc.com",
    tier: "Employee",
    department: "Product",
    managerId: "leader-003",
    status: "active",
    createdAt: "2024-01-17",
    password: "member123",
  },
  {
    id: "employee-006",
    name: "Pooja Nambiar",
    email: "pooja.n@vnc.com",
    tier: "Employee",
    department: "Product",
    managerId: "leader-003",
    status: "active",
    createdAt: "2024-01-17",
    password: "member123",
  },
  {
    id: "employee-007",
    name: "Rahul Verma",
    email: "rahul.v@vnc.com",
    tier: "Employee",
    department: "Product",
    managerId: "leader-008",
    status: "active",
    createdAt: "2024-01-17",
    password: "member123",
  },
  {
    id: "employee-008",
    name: "Divya Menon",
    email: "divya.m@vnc.com",
    tier: "Employee",
    department: "Product",
    managerId: "leader-008",
    status: "active",
    createdAt: "2024-01-17",
    password: "member123",
  },
  {
    id: "employee-009",
    name: "Sameer Khan",
    email: "sameer.k@vnc.com",
    tier: "Employee",
    department: "Marketing",
    managerId: "leader-004",
    status: "active",
    createdAt: "2024-01-18",
    password: "member123",
  },
  {
    id: "employee-010",
    name: "Ritu Chandran",
    email: "ritu.c@vnc.com",
    tier: "Employee",
    department: "Marketing",
    managerId: "leader-004",
    status: "active",
    createdAt: "2024-01-18",
    password: "member123",
  },
  {
    id: "employee-011",
    name: "Varun Kapoor",
    email: "varun.k@vnc.com",
    tier: "Employee",
    department: "Sales",
    managerId: "leader-005",
    status: "active",
    createdAt: "2024-01-18",
    password: "member123",
  },
  {
    id: "employee-012",
    name: "Tanya Bose",
    email: "tanya.b@vnc.com",
    tier: "Employee",
    department: "Sales",
    managerId: "leader-005",
    status: "active",
    createdAt: "2024-01-18",
    password: "member123",
  },
  {
    id: "employee-013",
    name: "Anil Kumar",
    email: "anil.k@vnc.com",
    tier: "Employee",
    department: "Finance",
    managerId: "leader-006",
    status: "active",
    createdAt: "2024-01-19",
    password: "member123",
  },
  {
    id: "employee-014",
    name: "Zoya Ahmed",
    email: "zoya.a@vnc.com",
    tier: "Employee",
    department: "Finance",
    managerId: "leader-006",
    status: "active",
    createdAt: "2024-01-19",
    password: "member123",
  },
  {
    id: "employee-015",
    name: "Manish Pillai",
    email: "manish.p@vnc.com",
    tier: "Employee",
    department: "Customer Success",
    managerId: "leader-007",
    status: "active",
    createdAt: "2024-01-19",
    password: "member123",
  },
  {
    id: "employee-016",
    name: "Kavya Reddy",
    email: "kavya.r@vnc.com",
    tier: "Employee",
    department: "Customer Success",
    managerId: "leader-007",
    status: "active",
    createdAt: "2024-01-19",
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
    businessUnit: "EFA",
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
  CEO: () => "Chief Executive Officer",
  MD: () => "Managing Director",
  Founder: () => "Founder",
  Admin: () => "Administrator",
  Finance: (department) => `${department} Finance Lead`,
  BUHead: (department) => `${department} BU Head`,
  HR: (department) => `${department} HR Lead`,
  Marketing: (department) => `${department} Marketing Lead`,
  ProjectManager: (department) => `${department} Project Manager`,
  TeamLeader: (department) => `${department} Team Lead`,
  AssistantTeamLeader: (department) => `${department} Assistant Team Lead`,
  Analyst: (department) => `${department} Analyst`,
  Employee: (department) => `${department} Associate`,
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
  MD: 7000000,
  Founder: 8000000,
  Admin: 3200000,
  Finance: 2600000,
  BUHead: 3000000,
  HR: 2200000,
  Marketing: 2200000,
  ProjectManager: 2800000,
  TeamLeader: 1600000,
  AssistantTeamLeader: 1200000,
  Analyst: 900000,
  Employee: 900000,
};

const dobYearByTier: Record<SeedTier, number> = {
  CEO: 1975,
  MD: 1977,
  Founder: 1970,
  Admin: 1982,
  Finance: 1984,
  BUHead: 1983,
  HR: 1986,
  Marketing: 1987,
  ProjectManager: 1985,
  TeamLeader: 1990,
  AssistantTeamLeader: 1992,
  Analyst: 1995,
  Employee: 1996,
};

/** Employee Module v1.1, Section 3 fields, derived from the seed-only tier. */
const orgFieldsByTier: Record<
  SeedTier,
  { departmentFunction: DepartmentFunction; isTeamLead: boolean; isBusinessUnitHead: boolean }
> = {
  CEO: { departmentFunction: "Leadership", isTeamLead: false, isBusinessUnitHead: false },
  MD: { departmentFunction: "Leadership", isTeamLead: false, isBusinessUnitHead: false },
  Founder: { departmentFunction: "Leadership", isTeamLead: false, isBusinessUnitHead: false },
  Admin: { departmentFunction: "Admin", isTeamLead: false, isBusinessUnitHead: false },
  Finance: { departmentFunction: "Finance", isTeamLead: false, isBusinessUnitHead: false },
  BUHead: { departmentFunction: "Operations", isTeamLead: false, isBusinessUnitHead: true },
  HR: { departmentFunction: "HR", isTeamLead: false, isBusinessUnitHead: false },
  Marketing: { departmentFunction: "Marketing", isTeamLead: false, isBusinessUnitHead: false },
  ProjectManager: { departmentFunction: "Operations", isTeamLead: false, isBusinessUnitHead: false },
  TeamLeader: { departmentFunction: "Operations", isTeamLead: true, isBusinessUnitHead: false },
  AssistantTeamLeader: {
    departmentFunction: "Operations",
    isTeamLead: false,
    isBusinessUnitHead: false,
  },
  Analyst: { departmentFunction: "Finance", isTeamLead: false, isBusinessUnitHead: false },
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
  MD: "desiglvl-exec",
  Founder: "desiglvl-exec",
  Admin: "desiglvl-senior-mgmt",
  Finance: "desiglvl-senior-mgmt",
  BUHead: "desiglvl-senior-mgmt",
  HR: "desiglvl-senior-mgmt",
  Marketing: "desiglvl-senior-mgmt",
  ProjectManager: "desiglvl-mgmt",
  TeamLeader: "desiglvl-team-lead",
  AssistantTeamLeader: "desiglvl-team-lead",
  Analyst: "desiglvl-ic",
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
    primaryBusinessUnit: null,
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

  console.log("Done. Demo logins (password shown, all hashed in the DB):");
  console.log("  ceo@vnc.com / ceo123");
  console.log("  md@vnc.com / md123");
  console.log("  manager@vnc.com / manager123");
  console.log("  leader@vnc.com / leader123");
  console.log("  member@vnc.com / member123");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await queryClient.end();
  });
