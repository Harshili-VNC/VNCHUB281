// Client-side auth context. Used to read/write directly to localStorage;
// now it's a thin wrapper around React Query + the server functions in
// src/api/*, so every route/component that already calls useAuth() keeps
// working unchanged.

import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getBootstrapFn } from "../api/queries";
import { signInFn, signOutFn } from "../api/auth.mutations";
import {
  addPersonFn,
  updatePersonFn,
  setPersonStatusFn,
  reassignPersonFn,
} from "../api/people.mutations";
import type { Person, PersonStatus, DepartmentFunction } from "./hierarchy";

// Re-export the pure hierarchy types/helpers so existing imports like
// `import { useAuth, getDirectReports } from "@/lib/auth"` keep working.
export * from "./hierarchy";
export type AuthUser = Person;

/** Static list used only to render the "quick sign-in" buttons on the login screen. */
export const demoAccounts: { label: string; name: string; email: string; password: string }[] = [
  { label: "CEO", name: "Aarav Mehta", email: "ceo@vnc.com", password: "ceo123" },
  { label: "MD", name: "Ishaan Kapoor", email: "md@vnc.com", password: "md123" },
  { label: "Founder", name: "Devika Chandran", email: "founder@vnc.com", password: "founder123" },
  { label: "Admin", name: "Nikhil Bansal", email: "admin@vnc.com", password: "admin123" },
  { label: "Finance", name: "Meher Kulkarni", email: "finance@vnc.com", password: "finance123" },
  { label: "BU Head", name: "Divya Suresh", email: "buhead@vnc.com", password: "buhead123" },
  { label: "HR", name: "Kabir Malhotra", email: "hr@vnc.com", password: "hr123" },
  { label: "Marketing", name: "Simran Kaur", email: "marketing@vnc.com", password: "marketing123" },
  {
    label: "Project Manager",
    name: "Harshili Reddy",
    email: "manager@vnc.com",
    password: "manager123",
  },
  { label: "Team Leader", name: "Karthik Venkat", email: "leader@vnc.com", password: "leader123" },
  {
    label: "Assistant Team Leader",
    name: "Tanvi Oberoi",
    email: "atl@vnc.com",
    password: "atl123",
  },
  { label: "Analyst", name: "Yash Trivedi", email: "analyst@vnc.com", password: "analyst123" },
  { label: "Employee", name: "Ravi Iyer", email: "member@vnc.com", password: "member123" },
];

const BOOTSTRAP_QUERY_KEY = ["bootstrap"] as const;

type Result = { ok: true } | { ok: false; error: string };

/** Optional personal/employment fields shared by add + edit. */
type PersonDetailsInput = {
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other" | "prefer_not_to_say";
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  designation?: string;
  designationLevel?: string;
  hireDate?: string;
  salary?: number;
  employmentStatus?: "full_time" | "part_time" | "contract" | "intern";
};

/** Employee Module v1.1, Section 3: Role and Organization Mapping fields. */
type OrgMappingInput = {
  departmentFunction: DepartmentFunction;
  isTeamLead?: boolean;
  isBusinessUnitHead?: boolean;
  primaryBusinessUnit?: string;
  secondaryBusinessUnit?: string;
};

type AddPersonInput = PersonDetailsInput &
  OrgMappingInput & {
    firstName: string;
    lastName: string;
    email: string;
    department: string;
    managerId?: string; // reportingManager — optional only for top Leadership
    password: string;
  };

type UpdatePersonInput = PersonDetailsInput &
  OrgMappingInput & {
    firstName: string;
    lastName: string;
    email: string;
    department: string;
  };

type AddPersonResult =
  | {
      ok: true;
      person: {
        id: string;
        employeeCode: string;
        name: string;
        email: string;
        departmentFunction: DepartmentFunction;
      };
    }
  | { ok: false; error: string };

type AuthContextValue = {
  user: AuthUser | null;
  people: Person[];
  hydrated: boolean;
  signIn: (email: string, password: string) => Promise<Result>;
  signOut: () => Promise<void>;
  addPerson: (input: AddPersonInput) => Promise<AddPersonResult>;
  updatePerson: (id: string, updates: UpdatePersonInput) => Promise<Result>;
  setPersonStatus: (id: string, status: PersonStatus) => Promise<Result>;
  reassignPerson: (id: string, newManagerId: string) => Promise<Result>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const bootstrapQuery = useQuery({
    queryKey: BOOTSTRAP_QUERY_KEY,
    queryFn: () => getBootstrapFn(),
  });

  const user = bootstrapQuery.data?.user ?? null;
  const people = bootstrapQuery.data?.people ?? [];
  const hydrated = bootstrapQuery.isFetched;

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: BOOTSTRAP_QUERY_KEY });
  }

  async function signIn(email: string, password: string): Promise<Result> {
    const result = await signInFn({ data: { email, password } });
    if (result.ok) await refresh();
    return result;
  }

  async function signOut() {
    await signOutFn();
    await refresh();
  }

  async function addPerson(input: AddPersonInput): Promise<AddPersonResult> {
    const result = await addPersonFn({ data: input });
    if (result.ok) await refresh();
    return result;
  }

  async function updatePerson(id: string, updates: UpdatePersonInput): Promise<Result> {
    const result = await updatePersonFn({ data: { id, ...updates } });
    if (result.ok) await refresh();
    return result;
  }

  async function setPersonStatus(id: string, status: PersonStatus): Promise<Result> {
    const result = await setPersonStatusFn({ data: { id, status } });
    if (result.ok) await refresh();
    return result;
  }

  async function reassignPerson(id: string, newManagerId: string): Promise<Result> {
    const result = await reassignPersonFn({ data: { id, newManagerId } });
    if (result.ok) await refresh();
    return result;
  }

  const value: AuthContextValue = {
    user,
    people,
    hydrated,
    signIn,
    signOut,
    addPerson,
    updatePerson,
    setPersonStatus,
    reassignPerson,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
