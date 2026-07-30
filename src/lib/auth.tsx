// Client-side auth context. Used to read/write directly to localStorage;
// now it's a thin wrapper around React Query + the server functions in
// src/api/*, so every route/component that already calls useAuth() keeps
// working unchanged.

import { createContext, useContext, useState, type ReactNode } from "react";
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

/** Clean production accounts list (no hardcoded demo credentials). */
export const demoAccounts: { label: string; name: string; email: string; password: string }[] = [];

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
  userPermissions: Record<string, boolean>;
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

  const [activeSession, setActiveSession] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("vnc_hub_authenticated") === "true";
    }
    return false;
  });

  const bootstrapQuery = useQuery({
    queryKey: BOOTSTRAP_QUERY_KEY,
    queryFn: () => getBootstrapFn(),
  });

  const rawUser = bootstrapQuery.data?.user ?? null;
  const rawUserPermissions = (bootstrapQuery.data as any)?.userPermissions ?? {};
  const people = bootstrapQuery.data?.people ?? [];
  const hydrated = bootstrapQuery.isFetched;

  const user = activeSession ? rawUser : null;
  const userPermissions = activeSession ? rawUserPermissions : {};

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: BOOTSTRAP_QUERY_KEY });
  }

  async function signIn(email: string, password: string): Promise<Result> {
    const result = await signInFn({ data: { email, password } });
    if (result.ok) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("vnc_hub_authenticated", "true");
      }
      setActiveSession(true);
      await refresh();
    }
    return result;
  }

  async function signOut() {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("vnc_hub_authenticated");
    }
    setActiveSession(false);
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
    userPermissions,
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
