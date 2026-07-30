import postgres from "postgres";
import { config as loadEnv } from "dotenv";

loadEnv();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not set in .env");
  process.exit(1);
}

const sql = postgres(connectionString);

async function resetSchema() {
  console.log("Resetting database schema...");
  try {
    await sql.unsafe(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO public;
    `);
    console.log("Database schema reset successfully!");
  } catch (err) {
    console.error("Error resetting schema:", err);
  } finally {
    await sql.end();
  }
}

resetSchema();
