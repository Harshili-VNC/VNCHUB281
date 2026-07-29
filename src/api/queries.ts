// Server-only. Bootstrap query + per-employee profile query.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSessionPersonId } from "./session";
import {
  loadPeople,
  loadTasks,
  loadLeaveRequests,
  loadClients,
  loadDocuments,
  loadClientChangeRequests,
  loadEmployeeHistory,
  loadImportJobs,
  loadExportJobs,
  loadClientContacts,
  loadClientAccounts,
  loadClientSoftwareStacks,
  loadEmployeeLearningPaths,
  loadEmployeeCourses,
  loadEmployeeCareerPaths,
  loadEmployeeKraGoals,
  loadEmployeeAppraisals,
  loadEmployeeRecognitions,
  loadEmployeeAssets,
  loadEmployeePersonalAssets,
  loadEmployeePolicy,
  loadEmployeeAttendanceSummaries,
  loadEmployeeLeaveSummaries,
  loadEmployeeHrDocuments,
  loadEmployeeProjectHistory,
  loadEmployeeCompensationHistory,
} from "./repo";
import type { Person } from "../lib/hierarchy";
import { filterClientsByRole, canViewSensitiveClientData } from "../lib/client-visibility";

export const getBootstrapFn = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const [
      personId,
      people,
      tasks,
      leaveRequests,
      rawClients,
      documents,
      clientChangeRequests,
      employeeHistory,
      importJobs,
      exportJobs,
    ] = await Promise.all([
      getSessionPersonId().catch(() => null),
      loadPeople().catch(() => []),
      loadTasks().catch(() => []),
      loadLeaveRequests().catch(() => []),
      loadClients().catch(() => []),
      loadDocuments().catch(() => []),
      loadClientChangeRequests().catch(() => []),
      loadEmployeeHistory().catch(() => []),
      loadImportJobs().catch(() => []),
      loadExportJobs().catch(() => []),
    ]);

    const match = personId ? (people.find((p: Person) => p.id === personId) ?? null) : null;
    const user = match && match.status === "active" ? match : null;

    // Backend filtering of clients by user Business Unit role
    let visibleClients = filterClientsByRole(rawClients, user);

    // Backend sanitization of sensitive commercial data if user is not authorized
    if (user && !canViewSensitiveClientData(user)) {
      visibleClients = visibleClients.map((c) => ({
        ...c,
        billingNotes: undefined,
        paymentTerms: undefined,
        commercialNotes: undefined,
        contractCopyLink: undefined,
      }));
    }

    return {
      user,
      people,
      tasks,
      leaveRequests,
      clients: visibleClients,
      documents,
      clientChangeRequests,
      employeeHistory,
      importJobs,
      exportJobs,
    };
  } catch (error) {
    console.error("Bootstrap data load warning:", error);
    return {
      user: null,
      people: [],
      tasks: [],
      leaveRequests: [],
      clients: [],
      documents: [],
      clientChangeRequests: [],
      employeeHistory: [],
      importJobs: [],
      exportJobs: [],
    };
  }
});

/** Loads the full 10-tab employee profile for a given person. */
export const getEmployeeProfileFn = createServerFn({ method: "GET" })
  .validator(z.object({ personId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { personId } = data;
    try {
      const [
        learningPaths,
        courses,
        careerPaths,
        kraGoals,
        appraisals,
        recognitions,
        assets,
        personalAssets,
        policy,
        attendanceSummaries,
        leaveSummaries,
        hrDocuments,
        projectHistory,
        compensationHistory,
      ] = await Promise.all([
        loadEmployeeLearningPaths(personId).catch(() => []),
        loadEmployeeCourses(personId).catch(() => []),
        loadEmployeeCareerPaths(personId).catch(() => []),
        loadEmployeeKraGoals(personId).catch(() => []),
        loadEmployeeAppraisals(personId).catch(() => []),
        loadEmployeeRecognitions(personId).catch(() => []),
        loadEmployeeAssets(personId).catch(() => []),
        loadEmployeePersonalAssets(personId).catch(() => []),
        loadEmployeePolicy(personId).catch(() => null),
        loadEmployeeAttendanceSummaries(personId).catch(() => []),
        loadEmployeeLeaveSummaries(personId).catch(() => []),
        loadEmployeeHrDocuments(personId).catch(() => []),
        loadEmployeeProjectHistory(personId).catch(() => []),
        loadEmployeeCompensationHistory(personId).catch(() => []),
      ]);

      return {
        learningPaths,
        courses,
        careerPaths,
        kraGoals,
        appraisals,
        recognitions,
        assets,
        personalAssets,
        policy,
        attendanceSummaries,
        leaveSummaries,
        hrDocuments,
        projectHistory,
        compensationHistory,
      };
    } catch {
      return {
        learningPaths: [],
        courses: [],
        careerPaths: [],
        kraGoals: [],
        appraisals: [],
        recognitions: [],
        assets: [],
        personalAssets: [],
        policy: null,
        attendanceSummaries: [],
        leaveSummaries: [],
        hrDocuments: [],
        projectHistory: [],
        compensationHistory: [],
      };
    }
  });

/** Loads client sub-entities (contacts, accounts, software stack) for a given client. */
export const getClientDetailsFn = createServerFn({ method: "GET" })
  .validator(z.object({ clientId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { clientId } = data;
    try {
      const [contacts, accounts, softwareStacks] = await Promise.all([
        loadClientContacts(clientId).catch(() => []),
        loadClientAccounts(clientId).catch(() => []),
        loadClientSoftwareStacks(clientId).catch(() => []),
      ]);
      return { contacts, accounts, softwareStacks };
    } catch {
      return { contacts: [], accounts: [], softwareStacks: [] };
    }
  });
