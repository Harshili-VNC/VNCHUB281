import postgres from "postgres";
import { config as loadEnv } from "dotenv";

loadEnv();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(connectionString);

const businessTables = [
  "people",
  "credentials",
  "clients",
  "client_accounts",
  "client_contacts",
  "client_change_requests",
  "client_history",
  "client_software_stacks",
  "tasks",
  "leave_requests",
  "employee_history",
  "employee_documents",
  "employee_assets",
  "employee_attendance_summaries",
  "employee_compensation_history",
  "employee_project_history",
  "employee_courses",
  "employee_learning_paths",
  "employee_career_paths",
  "employee_kra_goals",
  "employee_leave_summaries",
  "employee_recognitions",
  "employee_personal_assets",
  "employee_policies",
  "employee_appraisals",
  "documents",
  "analysis_reports",
  "import_jobs",
  "export_jobs",
];

const masterTables = [
  "departments",
  "designations",
  "designation_levels",
];

async function verifyProductionDb() {
  console.log("=== VERIFYING PRODUCTION DATABASE TABLES ===");
  let allClean = true;

  console.log("\n--- BUSINESS TABLES (MUST HAVE COUNT = 0) ---");
  for (const table of businessTables) {
    try {
      const [{ count }] = await sql.unsafe(`SELECT count(*)::int as count FROM ${table};`);
      const status = count === 0 ? "PASSED (0 rows)" : `FAILED (${count} rows)`;
      if (count !== 0) allClean = false;
      console.log(`  - ${table.padEnd(35)}: ${status}`);
    } catch (err: any) {
      console.log(`  - ${table.padEnd(35)}: NOT PRESENT / SKIP (${err.message})`);
    }
  }

  console.log("\n--- MASTER REFERENCE TABLES (PRESERVED) ---");
  for (const table of masterTables) {
    try {
      const [{ count }] = await sql.unsafe(`SELECT count(*)::int as count FROM ${table};`);
      console.log(`  - ${table.padEnd(35)}: PRESERVED (${count} rows)`);
    } catch (err: any) {
      console.log(`  - ${table.padEnd(35)}: NOT PRESENT (${err.message})`);
    }
  }

  if (allClean) {
    console.log("\n✅ SUCCESS: ALL BUSINESS TABLES HAVE COUNT(*) = 0. SYSTEM IS 100% PRODUCTION READY!");
  } else {
    console.error("\n❌ WARNING: SOME BUSINESS TABLES STILL CONTAIN DEMO ROWS!");
  }

  await sql.end();
}

verifyProductionDb();
