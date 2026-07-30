// One-off, targeted fix — adds ONLY the two columns needed for client
// delete/restore, bypassing drizzle-kit push/generate/migrate entirely.
//
// WHY THIS EXISTS: this project's schema was built up almost entirely via
// `drizzle-kit push` (which never records migration files), so drizzle's
// tracked migration history is missing most of what's actually live in
// the database. That mismatch is what caused both the "column is in a
// primary key" error from `push` and the "type already exists" error
// from the generated migration — neither is caused by this change itself,
// both are symptoms of the pre-existing gap in migration history.
//
// This script sidesteps that entire problem: drizzle-orm's query engine
// doesn't care about migration history at all, only about whether the
// live table actually has the columns schema.ts expects. So this just
// adds them directly, with IF NOT EXISTS guards so it's safe to run more
// than once by accident.
//
// HOW TO RUN
//   npx tsx src/scripts/add-client-delete-columns.ts

import { config as loadEnv } from "dotenv";
loadEnv();

import postgres from "postgres";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set in .env");
    process.exit(1);
  }

  const sql = postgres(connectionString);

  try {
    console.log("Checking current columns on clients table...");
    const before = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'clients' AND column_name IN ('deleted_at', 'deleted_by')
    `;
    console.log("Already present:", before.map((r) => r.column_name));

    console.log("Adding deleted_at (if missing)...");
    await sql`ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone`;

    console.log("Adding deleted_by (if missing)...");
    await sql`ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "deleted_by" text`;

    const after = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'clients' AND column_name IN ('deleted_at', 'deleted_by')
    `;
    console.log("Now present:", after.map((r) => r.column_name));

    if (after.length === 2) {
      console.log("\nSuccess — both columns exist on clients now. Restart your dev server and clients should load normally.");
    } else {
      console.error("\nSomething's still missing — only found:", after.map((r) => r.column_name));
    }
  } catch (err) {
    console.error("Failed:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
