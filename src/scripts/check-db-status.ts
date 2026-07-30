import { config as loadEnv } from "dotenv";
loadEnv();

import { db, queryClient } from "../db/client";
import { clients, people, credentials } from "../db/schema";

async function main() {
  console.log("=== DB STATUS DIAGNOSTIC ===");

  const allClients = await db.select().from(clients);
  console.log(`Total clients in DB: ${allClients.length}`);

  if (allClients.length > 0) {
    const recordStatuses = new Map<string, number>();
    const statuses = new Map<string, number>();
    for (const c of allClients) {
      recordStatuses.set(c.recordStatus, (recordStatuses.get(c.recordStatus) || 0) + 1);
      statuses.set(c.status, (statuses.get(c.status) || 0) + 1);
    }
    console.log("Client Record Statuses:", Object.fromEntries(recordStatuses));
    console.log("Client Statuses:", Object.fromEntries(statuses));
    console.log("Sample client:", {
      id: allClients[0].id,
      name: allClients[0].name,
      code: allClients[0].code,
      recordStatus: allClients[0].recordStatus,
      status: allClients[0].status,
      businessUnit: allClients[0].businessUnit,
      teamLeadId: allClients[0].teamLeadId,
      managerId: allClients[0].businessUnitManagerId,
    });
  }

  const allPeople = await db.select().from(people);
  console.log(`\nTotal people in DB: ${allPeople.length}`);
  for (const p of allPeople) {
    console.log(`  - Person: ${p.name} (${p.email}) | Designation: ${p.designation} | Status: ${p.status}`);
  }

  const allCreds = await db.select().from(credentials);
  console.log(`\nTotal credentials in DB: ${allCreds.length}`);
  for (const c of allCreds) {
    console.log(`  - Credential Email: ${c.email}`);
  }
}

main()
  .catch((err) => {
    console.error("Diagnostic error:", err);
  })
  .finally(async () => {
    await queryClient.end();
  });
