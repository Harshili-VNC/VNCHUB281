import { config as loadEnv } from "dotenv";
loadEnv();

import { db, queryClient } from "../db/client";
import { clients, clientAccounts, clientContacts } from "../db/schema";

async function main() {
  console.log("Cleaning clients, client_accounts, and client_contacts tables...");

  await db.delete(clientContacts);
  await db.delete(clientAccounts);
  await db.delete(clients);

  console.log("Successfully wiped all client records.");
  console.log("Now you can re-run:");
  console.log("  npx tsx src/scripts/import-production-clients.ts --imported-by=\"Harshili Patni\"");
}

main()
  .catch((err) => {
    console.error("Error clearing client tables:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await queryClient.end();
  });
