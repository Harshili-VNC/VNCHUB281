// Server-only. One call that returns everything the client needs on load:
// who's signed in (if anyone), the full people roster, tasks, and leave
// requests. The client scopes/filters this data itself using the same pure
// helpers from src/lib/hierarchy.ts and src/lib/workspace.ts as before.

import { createServerFn } from "@tanstack/react-start";
import { getSessionPersonId } from "./session";
import { loadPeople, loadTasks, loadLeaveRequests } from "./repo";
import type { Person } from "../lib/hierarchy";

export const getBootstrapFn = createServerFn({ method: "GET" }).handler(async () => {
  const [personId, people, tasks, leaveRequests] = await Promise.all([
    getSessionPersonId(),
    loadPeople(),
    loadTasks(),
    loadLeaveRequests(),
  ]);

  const match = personId ? (people.find((p: Person) => p.id === personId) ?? null) : null;
  // A deactivated account shouldn't come back as "signed in" even if an old
  // session cookie is still floating around.
  const user = match && match.status === "active" ? match : null;

  return { user, people, tasks, leaveRequests };
});
