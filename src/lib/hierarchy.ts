// Pure, framework-free organization logic shared by the browser (dashboard,
// teams page, sidebar) and the server (validating mutations against the DB).
// Employee Module spec v1.1, Section 3 (Role and Organization Mapping).

export type DepartmentFunction =
  | "Finance"
  | "HR"
  | "Marketing"
  | "Operations"
  | "Leadership"
  | "Admin"
  | "IT / Systems";

export const departmentFunctions: DepartmentFunction[] = [
  "Finance",
  "HR",
  "Marketing",
  "Operations",
  "Leadership",
  "Admin",
  "IT / Systems",
];

export type PersonStatus = "active" | "inactive";
export type Gender = "male" | "female" | "other" | "prefer_not_to_say";
export type EmploymentStatus = "full_time" | "part_time" | "contract" | "intern";

export type Person = {
  id: string;
  employeeCode: string;
  name: string;       // computed: "first last"
  department: string; // computed display name
  firstName: string;
  lastName: string;
  email: string;
  // --- Employee Module v1.1, Section 1: Basic Identity ---
  personalEmail: string | null;
  phoneNumber: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelation: string | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  departmentId: string;
  // --- Employee Module v1.1, Section 2: Employment Details ---
  hireDate: string | null;
  joiningCtc: number | null;
  employmentStatus: EmploymentStatus;
  dateOfExit: string | null;
  nonActiveReason: string | null;
  nonActiveOtherReasonText: string | null;
  salary: number | null;
  // --- Employee Module v1.1, Section 3: Role and Organization Mapping ---
  departmentFunction: DepartmentFunction;
  isTeamLead: boolean;
  isBusinessUnitHead: boolean;
  designation: string | null;
  designationLevel: string | null;
  primaryBusinessUnit: string | null;
  secondaryBusinessUnit: string | null;
  managerId: string | null;
  officialWorkLocation: string | null;
  employeeCategory: string | null;
  currentActiveForPlanning: boolean;
  // --- Employee Module v1.1, Section 4: Cost and Capacity Planning ---
  standardMonthlyCapacityHours: number | null;
  standardProjectHours: number | null;
  standardProjectActivityHours: number | null;
  standardOrganisationalActivityHours: number | null;
  // --- Employee Module v1.1, Section 5: Role Tags and Notes ---
  roleTags: string[];  // parsed from JSON
  notesRemarks: string | null;
  status: PersonStatus;
  createdAt: string;
  updatedAt: string;
};

export function getDirectReports(people: Person[], managerId: string): Person[] {
  return people.filter((p) => p.managerId === managerId);
}

/** Includes the root person themselves, plus every level of subordinate beneath them. */
export function getDescendants(people: Person[], rootId: string): Person[] {
  const root = people.find((p) => p.id === rootId);
  if (!root) return [];
  const result: Person[] = [root];
  const queue: string[] = [rootId];
  while (queue.length) {
    const current = queue.shift()!;
    for (const child of getDirectReports(people, current)) {
      result.push(child);
      queue.push(child.id);
    }
  }
  return result;
}

/** Nearest manager first, going up to the top of the org. */
export function getManagerChain(people: Person[], personId: string): Person[] {
  const chain: Person[] = [];
  let current = people.find((p) => p.id === personId);
  const seen = new Set<string>();
  while (current?.managerId && !seen.has(current.managerId)) {
    seen.add(current.managerId);
    const manager = people.find((p) => p.id === current!.managerId);
    if (!manager) break;
    chain.push(manager);
    current = manager;
  }
  return chain;
}

export function isTopLeadership(person: Person): boolean {
  return person.departmentFunction === "Leadership";
}

export function canAddPeople(actor: Person): boolean {
  return (
    actor.departmentFunction === "Leadership" ||
    actor.departmentFunction === "Admin" ||
    actor.departmentFunction === "HR" ||
    actor.isBusinessUnitHead ||
    actor.isTeamLead
  );
}

export function getVisiblePeople(people: Person[], actor: Person): Person[] {
  if (actor.departmentFunction === "Leadership" || actor.departmentFunction === "Admin") {
    return people;
  }
  return getDescendants(people, actor.id);
}

export function eligibleNewManagers(people: Person[], actor: Person, target: Person): Person[] {
  const visible = getVisiblePeople(people, actor);
  return visible.filter(
    (p) =>
      (p.isTeamLead ||
        p.isBusinessUnitHead ||
        p.departmentFunction === "Leadership" ||
        p.departmentFunction === "Admin") &&
      p.status === "active" &&
      p.id !== target.id &&
      p.id !== target.managerId,
  );
}
