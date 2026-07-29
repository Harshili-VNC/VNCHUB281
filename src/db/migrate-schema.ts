import postgres from "postgres";
import { config as loadEnv } from "dotenv";

loadEnv();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(connectionString);

async function cleanProductionData() {
  console.log("Cleaning all demo business records for production deployment...");
  try {
    await sql.unsafe(`
      TRUNCATE TABLE 
        people,
        credentials,
        clients,
        client_accounts,
        client_contacts,
        client_change_requests,
        client_software_stacks,
        client_history,
        tasks,
        leave_requests,
        employee_history,
        employee_appraisals,
        employee_assets,
        employee_attendance_summaries,
        employee_career_paths,
        employee_compensation_history,
        employee_courses,
        employee_documents,
        employee_kra_goals,
        employee_learning_paths,
        employee_leave_summaries,
        employee_personal_assets,
        employee_policies,
        employee_project_history,
        employee_recognitions,
        analysis_reports,
        documents,
        import_jobs,
        export_jobs
      CASCADE;
    `);

    const [{ peopleCount }] = await sql`SELECT count(*)::int as "peopleCount" FROM people;`;
    const [{ clientCount }] = await sql`SELECT count(*)::int as "clientCount" FROM clients;`;
    const [{ taskCount }] = await sql`SELECT count(*)::int as "taskCount" FROM tasks;`;
    const [{ deptCount }] = await sql`SELECT count(*)::int as "deptCount" FROM departments;`;

    console.log(`PRODUCTION_DATA_CLEANUP_SUMMARY:`);
    console.log(`  - People count: ${peopleCount}`);
    console.log(`  - Clients count: ${clientCount}`);
    console.log(`  - Tasks count: ${taskCount}`);
    console.log(`  - Master Departments count: ${deptCount} (PRESERVED)`);
    console.log("SUCCESS: All demo business data removed. ERP is ready for production onboarding!");
  } catch (err) {
    console.error("Error during data cleanup:", err);
  } finally {
    await sql.end();
  }
}

cleanProductionData();
