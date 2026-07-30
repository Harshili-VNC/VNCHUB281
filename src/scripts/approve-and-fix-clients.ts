import { config as loadEnv } from "dotenv";
loadEnv();

import { db, queryClient } from "../db/client";
import { clients, people } from "../db/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Updating all client records to Approved & Active...");

  // 1. Update all existing clients to Approved and Active
  const updatedClients = await db
    .update(clients)
    .set({
      recordStatus: "Approved",
      status: "Active",
    })
    .returning({ id: clients.id, name: clients.name, code: clients.code });

  console.log(`Successfully updated ${updatedClients.length} clients to 'Approved' and 'Active'.`);

  // 2. Fetch people to attempt linking any unmatched manager / team lead IDs
  const allPeople = await db.select({ id: people.id, name: people.name }).from(people);
  const peopleMap = new Map(allPeople.map((p) => [p.name.toLowerCase().trim(), p.id]));

  console.log(`Found ${allPeople.length} people in database for manager/team lead linkage.`);
  
  if (allPeople.length === 0) {
    console.log("Note: To enable team-lead & manager-specific filtering, import people first with:");
    console.log("  npx tsx src/scripts/import-production-employees.ts --imported-by=\"Harshili Patni\"");
  }

  console.log("\nDone! All clients are now Approved and will show in the Client Master list.");
}

main()
  .catch((err) => {
    console.error("Error updating clients:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await queryClient.end();
  });
